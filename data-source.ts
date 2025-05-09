import { DataSource } from 'typeorm';
import { Team } from 'src/core/team/team.entity';
import { Crew } from 'src/core/crew/crew.entity';
import { CrewMember } from 'src/core/crew/member/crew-member.entity';
import { Ticket } from 'src/core/ticket/ticket.entity';
import { CrewLog } from 'src/core/crew/log/crew-log.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { CrewShare } from 'src/core/crew/share/crew-share.entity';
import { War } from 'src/game/war/war.entity';
import { Region, CurrentRegion } from 'src/game/region/region.entity';
import { RegionLog, CurrentRegionLog } from 'src/game/region/region-log.entity';
import { Poi, ExpandedPoi } from 'src/game/poi/poi.entity';
import { Catalog, ExpandedCatalog } from 'src/game/catalog/catalog.entity';
import { Stockpile } from 'src/inventory/stockpile/stockpile.entity';
import { StockpileLog } from 'src/inventory/stockpile/stockpile-log.entity';
import { StockpileAccess } from 'src/inventory/stockpile/stockpile-access.entity';
import { AccessEntry } from 'src/core/access/access.entity';
import {
  CurrentStockpileEntry,
  StockpileEntry,
} from 'src/inventory/stockpile/stockpile-entry.entity';
import { StockpileLogHistory } from 'src/inventory/stockpile/stockpile-history.entity';
import { StockpileDiff } from 'src/inventory/stockpile/stockpile-diff.entity';
import { Counter, CurrentCounter } from 'src/inventory/counter/counter.entity';
import { CounterEntry } from 'src/inventory/counter/counter-entry.entity';
import { CounterAccess } from 'src/inventory/counter/counter-access.entity';
import { GuildSetting } from 'src/core/guild/guild-setting.entity';
import { GuildAccess } from 'src/core/guild/guild-access.entity';
import * as migrations from 'src/database/migrations';
import { CrewAccess } from 'src/core/crew/crew-access.entity';
import { CrewSetting } from 'src/core/crew/crew-setting.entity';

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
    Ticket,
    CrewLog,
    Guild,
    GuildSetting,
    CrewShare,
    CrewAccess,
    CrewSetting,
    War,
    Region,
    CurrentRegion,
    RegionLog,
    CurrentRegionLog,
    Poi,
    ExpandedPoi,
    Catalog,
    ExpandedCatalog,
    Stockpile,
    StockpileLog,
    StockpileEntry,
    StockpileLogHistory,
    StockpileDiff,
    StockpileAccess,
    AccessEntry,
    CurrentStockpileEntry,
    Counter,
    CounterEntry,
    CounterAccess,
    CurrentCounter,
    GuildAccess,
  ],
  subscribers: [],
  migrations,
  migrationsTableName: 'migrations_history',
});
