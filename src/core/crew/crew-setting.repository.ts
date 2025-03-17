import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { CrewSetting } from './crew-setting.entity';

@Injectable()
export class CrewSettingRepository extends CommonRepository<CrewSetting> {
  constructor(private readonly dataSource: DataSource) {
    super(CrewSetting, dataSource.createEntityManager());
  }
}
