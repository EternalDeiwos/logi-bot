import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Snowflake } from 'discord.js';
import { CrewLog } from './crew-log.entity';

@Injectable()
export class CrewLogRepository extends Repository<CrewLog> {
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
