import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { RegionLog } from 'src/game/region/region-log.entity';
import { CurrentPoi, Poi } from './poi.entity';

@Injectable()
export class PoiRepository extends CommonRepository<Poi> {
  constructor(private readonly dataSource: DataSource) {
    super(Poi, dataSource.createEntityManager());
  }

  async populate(logs: RegionLog[]) {
    return await this.dataSource.transaction(async (tx) => {
      const update = await tx.update(Poi, { deletedAt: IsNull() }, { deletedAt: new Date() });
      let insertCount = 0;

      for (const log of logs) {
        const result = await tx.query(
          `
            WITH war AS (
              SELECT DISTINCT ON (war_number) * 
              FROM app.war 
              ORDER BY war_number DESC 
              LIMIT 1
            )
            INSERT INTO app.poi (region_id, war_number, x, y, marker_type)
            (
              SELECT DISTINCT ON (d->'x', d->'y')
                r.id region_id,
                w.war_number war_number,
                (d->'x')::float x,
                (d->'y')::float y,
                (d->'iconType')::int marker_type
              FROM (SELECT * FROM app.region_log_current WHERE hex_id=$1) u,
                war w, 
                jsonb_array_elements(u.data) d
              CROSS JOIN (
                SELECT *
                FROM app.region_current
                WHERE hex_id=$1
                  AND major_name IS NOT NULL
              ) r
              ORDER BY d->'x', d->'y', sqrt(power((d->'x')::float - r.x, 2) + power((d->'y')::float - r.y, 2)) ASC
            )
            RETURNING x, y;
          `,
          [log.hexId],
        );

        insertCount += result.length;
      }

      return { update: update.affected, insert: insertCount };
    });
  }
}

@Injectable()
export class CurrentPoiRepository extends Repository<CurrentPoi> {
  constructor(private readonly dataSource: DataSource) {
    super(CurrentPoi, dataSource.createEntityManager());
  }
}
