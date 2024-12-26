import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import { BaseError } from 'src/errors';
import { WarRepository } from './war.repository';
import { WarFaction } from './war.entity';
import { WarQueryBuilder } from './war.query';

type WarData = {
  warNumber: string;
  warId: string;
  winner: string;
  conquestStartTime: number;
  conquestEndTime: number;
};

@Injectable()
export class WarService {
  private readonly logger = new Logger(WarService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly warRepo: WarRepository,
  ) {}

  query() {
    return new WarQueryBuilder(this.warRepo);
  }

  async getCurrent() {
    try {
      return await this.warRepo.getCurrent();
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to get current war', err);
    }
  }

  async fetchWar(): Promise<WarData> {
    const api = this.configService.getOrThrow<string>('CLAPFOOT_API_URI');
    const uri = `${api}/worldconquest/war`;

    try {
      const response = await fetch(uri);
      return response.json();
    } catch (err) {
      throw new BaseError('CLAPFOOT_ERROR', 'Failed to fetch data from war API', err);
    }
  }

  async updateWar() {
    const { warNumber, warId, winner, conquestStartTime, conquestEndTime } = await this.fetchWar();

    try {
      const result = await this.warRepo.upsert(
        this.warRepo.create({
          warNumber,
          id: warId,
          winner: winner as WarFaction,
          startedAt: DateTime.fromMillis(conquestStartTime).toJSDate(),
          endedAt: conquestEndTime ? DateTime.fromMillis(conquestEndTime).toJSDate() : null,
        }),
        ['warNumber'],
      );

      const count = result?.identifiers?.length;
      if (count) {
        this.logger.log('Updated war');
      }

      return count;
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to update war status', err);
    }
  }
}
