import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { ActivityType, Client, PresenceUpdateStatus } from 'discord.js';
import { BaseError } from 'src/errors';
import { WarService } from 'src/game/war/war.service';
import { RegionService } from 'src/game/region/region.service';
import { PoiService } from 'src/game/poi/poi.service';
import { CatalogService } from 'src/game/catalog/catalog.service';

import * as pkg from '../../package.json';

@Injectable()
export class PollingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PollingService.name);

  constructor(
    private readonly client: Client,
    private readonly configService: ConfigService,
    private readonly warService: WarService,
    private readonly regionService: RegionService,
    private readonly poiService: PoiService,
    private readonly catalogService: CatalogService,
  ) {}

  async onApplicationBootstrap() {
    this.setBotStatus();
    await this.bootstrapWar();
    await this.bootstrapRegion();
    await this.bootstrapPoi();
    await this.bootstrapCatalog();
  }

  @Cron('3 * * * *')
  setBotStatus() {
    const nodeEnv = this.configService.getOrThrow('NODE_ENV');
    const state = nodeEnv === 'development' ? 'unstable' : `v${pkg.version}`;
    this.client.user.setPresence({
      activities: [{ name: 'activity', type: ActivityType.Custom, state }],
      status: PresenceUpdateStatus.Online,
    });
    this.logger.log('Bot status updated');
  }

  async bootstrapWar() {
    try {
      const war = await this.warService.query().byCurrent().getOne();

      if (war) {
        return this.logger.log('Active war detected');
      }
    } catch (err) {
      if (err instanceof BaseError) {
        this.logger.error(err, err.getCause());
      } else {
        this.logger.error(err, err.stack);
      }
    }

    this.logger.debug('Populating war...');
    await this.updateWar();
  }

  @Cron('*/15 * * * *')
  async updateWar() {
    try {
      await this.warService.updateWar();
    } catch (err) {
      if (err instanceof BaseError) {
        this.logger.error(err, err.getCause());
      } else {
        this.logger.error(err, err.stack);
      }
    }
  }

  async bootstrapRegion() {
    try {
      const count = await this.regionService.countActive();

      if (count) {
        this.logger.log(`${count} active regions`);
      } else {
        this.logger.debug('Populating regions...');
        await this.regionService.updateRegions();
      }

      await this.updateRegionLog();
    } catch (err) {
      if (err instanceof BaseError) {
        this.logger.error(err, err.getCause());
      } else {
        this.logger.fatal(err, err.stack);
      }
    }
  }

  @Cron('2-59/6 * * * *')
  async updateRegionLog() {
    try {
      const count = await this.regionService.updateRegionLog();
      if (count) {
        this.logger.log(`Added ${count} region updates`);
      }
    } catch (err) {
      if (err instanceof BaseError) {
        this.logger.error(err, err.getCause());
      } else {
        this.logger.fatal(err, err.stack);
      }
    }
  }

  async bootstrapPoi() {
    try {
      const count = await this.poiService.countActive();

      if (count) {
        this.logger.log(`${count} active points of interest`);
      } else {
        this.logger.debug('Populating points of interest...');
        await this.poiService.populatePoi();
      }
    } catch (err) {
      if (err instanceof BaseError) {
        this.logger.error(err, err.getCause());
      } else {
        this.logger.error(err, err.stack);
      }
    }
  }

  async bootstrapCatalog() {
    const gameVersion = await this.configService.getOrThrow('APP_FOXHOLE_VERSION');
    const catalogVersion = await this.configService.getOrThrow('APP_CATALOG_VERSION');

    try {
      const count = await this.catalogService.countCurrent();

      if (count) {
        this.logger.log(`${count} catalog items for ${gameVersion}/${catalogVersion}`);
      } else {
        this.logger.debug(`Populating catalog with ${gameVersion}/${catalogVersion}...`);
        await this.catalogService.updateDefaultCatalog(catalogVersion);
      }
    } catch (err) {
      if (err instanceof BaseError) {
        this.logger.error(err, err.getCause());
      } else {
        this.logger.error(err, err.stack);
      }
    }
  }
}
