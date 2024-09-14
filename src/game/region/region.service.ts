import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNull, Not } from 'typeorm';
import { DateTime } from 'luxon';
import { ArrayElement } from 'src/types';
import { WarService } from 'src/game/war/war.service';
import { BaseError } from 'src/errors';
import { CurrentRegionLogRepository, RegionLogRepository } from './region-log.repository';
import { CurrentRegionRepository, RegionRepository } from './region.repository';
import { RegionLog } from './region-log.entity';
import { Region } from './region.entity';

type HexData = {
  mapName: string;
  hexName: string;
};

type StaticMapData = {
  regionId: string;
  mapTextItems: { text: string; x: number; y: number; mapMarkerType: string }[];
};

@Injectable()
export class RegionService {
  private readonly logger = new Logger(RegionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly warService: WarService,
    private readonly regionRepo: RegionRepository,
    private readonly currentRegionRepo: CurrentRegionRepository,
    private readonly logRepo: RegionLogRepository,
    private readonly currentLogRepo: CurrentRegionLogRepository,
  ) {}

  private async fetchHexes(): Promise<HexData[]> {
    const api = this.configService.getOrThrow<string>('CLAPFOOT_API_URI');
    const uri = `${api}/worldconquest/maps`;

    try {
      const response = await fetch(uri);
      const json = (await response.json()) as string[];
      return json.map((mapName) => {
        const split = mapName.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');

        const [last] = split.slice(-1);

        if (last === 'Hex') {
          split.pop();
        }

        return {
          mapName,
          hexName: split.join(' '),
        };
      });
    } catch (err) {
      throw new BaseError('CLAPFOOT_ERROR', 'Failed to fetch data from war API', err);
    }
  }

  private async fetchRegions(): Promise<Region[]> {
    const api = this.configService.getOrThrow<string>('CLAPFOOT_API_URI');
    const hexes = await this.fetchHexes();
    const regions: Region[] = [];

    for (const hex of hexes) {
      const { mapName } = hex;
      let data: StaticMapData;

      try {
        const uri = `${api}/worldconquest/maps/${mapName}/static`;
        const response = await fetch(uri);
        data = await response.json();
      } catch (err) {
        throw new BaseError('CLAPFOOT_ERROR', 'Failed to fetch data from war API', err);
      }

      const { mapTextItems, regionId: hexId } = data;

      // Select minor regions and assign closest major region
      for (const minor of mapTextItems) {
        let closest: { major?: ArrayElement<StaticMapData['mapTextItems']>; distance: number };

        if (minor.mapMarkerType !== 'Minor') {
          continue;
        }

        for (const major of mapTextItems) {
          if (major.mapMarkerType !== 'Major') {
            continue;
          }

          const distance = Math.sqrt(
            Math.pow(major.x - minor.x, 2) + Math.pow(major.y - minor.y, 2),
          );

          if (!closest || distance < closest.distance) {
            closest = { major, distance };
          }
        }

        regions.push(
          this.regionRepo.create({
            hexId,
            hexName: hex.hexName,
            mapName: hex.mapName,
            majorName: closest.major.text,
            minorName: minor.text,
            x: minor.x,
            y: minor.y,
          }),
        );
      }

      // Select major region labels
      for (const major of mapTextItems) {
        if (major.mapMarkerType !== 'Major') {
          continue;
        }

        regions.push(
          this.regionRepo.create({
            hexId,
            hexName: hex.hexName,
            mapName: hex.mapName,
            majorName: major.text,
            x: major.x,
            y: major.y,
          }),
        );
      }

      // Select just the hex label for broad area definitions
      regions.push(
        this.regionRepo.create({
          hexId,
          hexName: hex.hexName,
          mapName: hex.mapName,
          x: 0.5,
          y: 0.5,
        }),
      );
    }

    return regions;
  }

  async updateRegions() {
    const regions = await this.fetchRegions();

    try {
      const { update, insert } = await this.regionRepo.replace(regions);
      this.logger.log(`Archived ${update} regions`, `Created ${insert} regions`);
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to update regions', err);
    }
  }

  async countActive() {
    try {
      return await this.currentRegionRepo.count();
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to get regions', err);
    }
  }

  async getHexes() {
    try {
      return await this.regionRepo.findBy({
        majorName: IsNull(),
        minorName: IsNull(),
        deletedAt: IsNull(),
      });
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to get regions', err);
    }
  }

  async getMajor() {
    try {
      return await this.regionRepo.findBy({
        majorName: Not(IsNull()),
        minorName: IsNull(),
        deletedAt: IsNull(),
      });
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to get regions', err);
    }
  }

  async getMinor() {
    try {
      return await this.regionRepo.findBy({
        majorName: Not(IsNull()),
        minorName: Not(IsNull()),
        deletedAt: IsNull(),
      });
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to get regions', err);
    }
  }

  async getLocations() {
    try {
      return await this.regionRepo.findBy({
        majorName: Not(IsNull()),
        deletedAt: IsNull(),
      });
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to get regions', err);
    }
  }

  async fetchRegionLog(): Promise<RegionLog[]> {
    const war = await this.warService.getCurrent();

    try {
      const metadata = await this.currentRegionRepo.getRegionLogMetadata();
      const api = this.configService.getOrThrow<string>('CLAPFOOT_API_URI');

      const promises = metadata.map(async (meta) => {
        const headers = meta.version ? { ['If-None-Match']: `"${meta.version}"` } : [];
        const uri = `${api}/worldconquest/maps/${meta.map_name}/dynamic/public`;

        try {
          const response = await fetch(uri, { headers });

          if (response.status !== 200) {
            this.logger.debug(
              `No update for ${meta.map_name}: ${response.status} ${response.statusText}`,
            );
            return;
          }

          const { version, mapItems: data, lastUpdated: updatedAt } = await response.json();
          this.logger.log(`Update for ${meta.map_name} version ${version}`);

          return this.logRepo.create({
            hexId: meta.hex_id,
            version,
            warNumber: war.warNumber,
            updatedAt: DateTime.fromMillis(updatedAt).toJSDate(),
            data,
          });
        } catch (err) {
          this.logger.error(
            new BaseError('CLAPFOOT_ERROR', 'Failed to fetch data from war API', meta),
            err.stack,
          );
          return;
        }
      });

      return (await Promise.all(promises)).filter((result) => Boolean(result));
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to get region metadata', err);
    }
  }

  async updateRegionLog() {
    const log = await this.fetchRegionLog();

    try {
      const result = await this.logRepo.insert(log);
      return result?.identifiers?.length;
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to update region log', err);
    }
  }

  async getCurrentRegionLog() {
    try {
      return await this.currentLogRepo.find();
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to get region log', err);
    }
  }
}
