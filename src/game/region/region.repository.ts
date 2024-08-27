import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { CurrentRegion, Region } from './region.entity';
import { CurrentRegionLog } from './region-log.entity';

export type RegionLogMetadata = {
  hex_id: string;
  map_name: string;
  version: number;
  updated_at: Date;
};

@Injectable()
export class RegionRepository extends CommonRepository<Region> {
  constructor(private readonly dataSource: DataSource) {
    super(Region, dataSource.createEntityManager());
  }

  replace(regions: Region[]) {
    return this.dataSource.transaction(async (tx) => {
      const update = await tx.update(Region, { deletedAt: IsNull() }, { deletedAt: new Date() });
      const insert = await tx.upsert(Region, regions, {
        skipUpdateIfNoValuesChanged: true,
        conflictPaths: ['hexId', 'majorName', 'minorName', 'deletedAt'],
      });

      return { update: update.affected, insert: insert.identifiers.length };
    });
  }
}

@Injectable()
export class CurrentRegionRepository extends Repository<CurrentRegion> {
  constructor(private readonly dataSource: DataSource) {
    super(CurrentRegion, dataSource.createEntityManager());
  }

  async getRegionLogMetadata(): Promise<RegionLogMetadata[]> {
    return this.createQueryBuilder('rr')
      .select(['rr.hex_id', 'rr.map_name', 'ru.version', 'ru.updated_at'])
      .distinctOn(['rr.hex_id'])
      .leftJoin(
        (qb) => qb.select(['hex_id', 'version', 'updated_at']).from(CurrentRegionLog, 'ru'),
        'ru',
        'rr.hex_id=ru.hex_id',
      )
      .getRawMany();
  }
}
