import { DataSource } from 'typeorm';
import * as migrations from './migrations';
import { Team } from 'src/bot/team/team.entity';
import { Crew } from 'src/bot/crew/crew.entity';
import { CrewMember } from 'src/bot/crew/crew-member.entity';
import { ForumTagTemplate } from 'src/bot/tag/tag-template.entity';
import { ForumTag } from 'src/bot/tag/tag.entity';
import { Ticket } from 'src/bot/ticket/ticket.entity';
import { CrewLog } from 'src/bot/crew/crew-log.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  schema: process.env.POSTGRES_SCHEMA,
  logging: true,
  entities: [Team, Crew, CrewMember, ForumTagTemplate, ForumTag, Ticket, CrewLog],
  subscribers: [],
  migrations,
  migrationsTableName: 'migrations_history',
});
