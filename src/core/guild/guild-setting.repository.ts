import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { GuildSetting } from './guild-setting.entity';

@Injectable()
export class GuildSettingRepository extends CommonRepository<GuildSetting> {
  constructor(private readonly dataSource: DataSource) {
    super(GuildSetting, dataSource.createEntityManager());
  }
}
