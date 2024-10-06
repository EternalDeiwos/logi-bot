import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { CrewMember, InsertCrewMember } from './crew-member.entity';

@Injectable()
export class CrewMemberRepository extends CommonRepository<CrewMember> {
  constructor(private readonly dataSource: DataSource) {
    super(CrewMember, dataSource.createEntityManager());
  }

  safeUpsert(payload: InsertCrewMember) {
    const [selectQuery] = this.createQueryBuilder('member')
      .select('member.access', 'access')
      .leftJoinAndSelect('member.guild', 'guild')
      .leftJoinAndSelect('member.crew', 'crew')
      .where('member.crew_channel_sf=:crewSf AND member.member_sf=:memberSf', payload)
      .getQueryAndParameters();

    const conflictColumns = ['crewSf', 'memberSf', 'deletedAt'].map(
      (prop) => this.metadata.findColumnWithPropertyName(prop).databaseName,
    );
    const [insertQuery, params] = this.createQueryBuilder()
      .insert()
      .into(CrewMember)
      .values(payload)
      .getQueryAndParameters();

    return this.query(
      `
      WITH existing AS (${selectQuery})
      ${insertQuery}
      ON CONFLICT (${conflictColumns.join(', ')}) 
      DO UPDATE SET 
        "name" = EXCLUDED."name", 
        "access" = (
          SELECT CASE 
            WHEN EXCLUDED."access"::text::integer > existing.access::text::integer 
            THEN existing."access" ELSE EXCLUDED."access" 
          END
          FROM existing
        )
      RETURNING *
    `,
      params,
    );
  }
}
