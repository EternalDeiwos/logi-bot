import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Snowflake } from 'discord.js';
import { CommonRepository } from 'src/database/util';
import { CrewLog } from './crew-log.entity';

@Injectable()
export class CrewLogRepository extends CommonRepository<CrewLog> {
  constructor(private readonly dataSource: DataSource) {
    super(CrewLog, dataSource.createEntityManager());
  }

  getLast(channelRef: Snowflake) {
    return this.createQueryBuilder('log')
      .where('log.crew_channel_sf = :discussion', {
        discussion: channelRef,
      })
      .orderBy('log.createdAt', 'DESC', 'NULLS FIRST');
  }
}
