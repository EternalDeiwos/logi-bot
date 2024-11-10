import { Injectable, Logger } from '@nestjs/common';
import { RegionService } from 'src/game/region/region.service';
import { BaseError } from 'src/errors';
import { CurrentPoiRepository, PoiRepository } from './poi.repository';
import { PoiQueryBuilder } from './poi.query';

export abstract class PoiService {
  abstract query(): PoiQueryBuilder;
  abstract populatePoi(): Promise<{ update: number; insert: number }>;
  abstract countActive(): Promise<number>;
}

@Injectable()
export class PoiServiceImpl extends PoiService {
  private readonly logger = new Logger(PoiService.name);

  constructor(
    private readonly regionService: RegionService,
    private readonly poiRepo: PoiRepository,
    private readonly currentPoiRepo: CurrentPoiRepository,
  ) {
    super();
  }

  query() {
    return new PoiQueryBuilder(this.currentPoiRepo);
  }

  async populatePoi() {
    const logs = await this.regionService.getCurrentRegionLog();

    try {
      const result = await this.poiRepo.populate(logs);
      const { update, insert } = result;
      this.logger.log(
        `Archived ${update} points of interest`,
        `Created ${insert} points of interest`,
      );
      return result;
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to populate poi', err);
    }
  }

  async countActive() {
    try {
      return this.currentPoiRepo.count();
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to get poi', err);
    }
  }
}
