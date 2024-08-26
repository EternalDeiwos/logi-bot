import { DataSource } from 'typeorm';
import * as migrations from 'src/database/migrations';
import { War } from 'src/game/war/war.entity';
import { CurrentRegion, Region } from 'src/game/region/region.entity';
import { CurrentRegionLog, RegionLog } from 'src/game/region/region-log.entity';
import { CurrentPoi, Poi } from 'src/game/poi/poi.entity';
import { Catalog, ExpandedCatalog } from 'src/game/catalog/catalog.entity';
import { Guild } from 'src/core/guild/guild.entity';
import { Stockpile } from 'src/inventory/stockpile/stockpile.entity';
import { StockpileLog } from 'src/inventory/stockpile/stockpile-log.entity';
import { StockpileEntry } from 'src/inventory/stockpile/stockpile-entry.entity';

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
    War,
    Region,
    CurrentRegion,
    RegionLog,
    CurrentRegionLog,
    Poi,
    CurrentPoi,
    Catalog,
    ExpandedCatalog,
    Guild,
    Stockpile,
    StockpileLog,
    StockpileEntry,
  ],
  subscribers: [],
  migrations,
  migrationsTableName: 'migrations_history',
});
