import { DataSource } from 'typeorm';
import { Team } from 'src/core/team/team.entity';
import { Crew } from 'src/core/crew/crew.entity';
import { CrewMember } from 'src/core/crew/member/crew-member.entity';
import { ForumTagTemplate } from 'src/core/tag/tag-template.entity';
import { ForumTag } from 'src/core/tag/tag.entity';
import { Ticket } from 'src/core/ticket/ticket.entity';
import { CrewLog } from 'src/core/crew/log/crew-log.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { CrewShare } from 'src/core/crew/share/crew-share.entity';
import { War } from 'src/game/war/war.entity';
import { Region } from 'src/game/region/region.entity';
import { RegionLog } from 'src/game/region/region-log.entity';
import { Poi } from 'src/game/poi/poi.entity';
import { Catalog } from 'src/game/catalog/catalog.entity';
import * as migrations from 'src/database/migrations';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  schema: process.env.POSTGRES_SCHEMA,
  logging: true,
  entities: [
    Team,
    Crew,
    CrewMember,
    ForumTagTemplate,
    ForumTag,
    Ticket,
    CrewLog,
    Guild,
    CrewShare,
    War,
    Region,
    RegionLog,
    Poi,
    Catalog,
  ],
  subscribers: [],
  migrations,
  migrationsTableName: 'migrations_history',
});
