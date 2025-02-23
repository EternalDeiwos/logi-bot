import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { GuildAccess } from './guild-access.entity';

@Injectable()
export class GuildAccessRepository extends CommonRepository<GuildAccess> {
  constructor(private readonly dataSource: DataSource) {
    super(GuildAccess, dataSource.createEntityManager());
  }
}
