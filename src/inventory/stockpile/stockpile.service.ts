import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteResult, InsertResult, UpdateResult } from 'typeorm';
import { Client, GuildManager, Snowflake } from 'discord.js';
import { groupBy } from 'lodash';
import { ValidationError } from 'src/errors';
import { WarService } from 'src/game/war/war.service';
import { InsertStockpile, SelectStockpile } from './stockpile.entity';
import { StockpileRepository } from './stockpile.repository';
import { StockpileLogRepository } from './stockpile-log.repository';
import {
  CurrentStockpileEntryRepository,
  StockpileEntryRepository,
} from './stockpile-entry.repository';
import { StockpileAccessRepository } from './stockpile-access.repository';
import { StockpileQueryBuilder } from './stockpile.query';
import { InsertStockpileLog, SelectStockpileLog } from './stockpile-log.entity';
import { StockpileLogQueryBuilder } from './stockpile-log.query';
import { InsertStockpileEntry } from './stockpile-entry.entity';
import { StockpileEntryQueryBuilder } from './stockpile-entry.query';
import { InsertStockpileAccess, SelectStockpileAccess } from './stockpile-access.entity';
import { StockpileLogDiffQueryBuilder } from './stockpile-diff.query';
import { StockpileDiffRepository } from './stockpile-diff.repository';
import { StockpileDiffPromptBuilder } from './stockpile-diff.prompt';

const MAX_EMBEDS = 2;

export abstract class StockpileService {
  abstract query(): StockpileQueryBuilder;
  abstract queryLog(): StockpileLogQueryBuilder;
  abstract queryEntries(): StockpileEntryQueryBuilder;
  abstract queryDiff(): StockpileLogDiffQueryBuilder;
  abstract registerStockpile(data: InsertStockpile): Promise<void>;
  abstract registerLog(data: InsertStockpileLog): Promise<InsertResult>;
  abstract updateStockpile(data: InsertStockpileEntry[]): Promise<InsertResult>;
  abstract completeLogProcessing(logRef: SelectStockpileLog): Promise<UpdateResult>;
  abstract grantAccess(data: InsertStockpileAccess): Promise<InsertResult>;
  abstract revokeAccess(
    accessRef: SelectStockpileAccess | SelectStockpileAccess[],
  ): Promise<UpdateResult>;
  abstract deleteStockpile(
    logRef: SelectStockpile | SelectStockpile[],
    deletedBy: Snowflake,
  ): Promise<DeleteResult>;
  abstract deleteLog(
    logRef: SelectStockpileLog | SelectStockpileLog[],
    deletedBy: Snowflake,
  ): Promise<DeleteResult>;
}

@Injectable()
export class StockpileServiceImpl extends StockpileService {
  private readonly logger = new Logger(StockpileService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly client: Client,
    private readonly guildManager: GuildManager,
    private readonly warService: WarService,
    private readonly stockpileRepo: StockpileRepository,
    private readonly logRepo: StockpileLogRepository,
    private readonly currentEntryRepo: CurrentStockpileEntryRepository,
    private readonly entryRepo: StockpileEntryRepository,
    private readonly accessRepo: StockpileAccessRepository,
    private readonly diffRepo: StockpileDiffRepository,
  ) {
    super();
  }

  query() {
    return new StockpileQueryBuilder(this.stockpileRepo, this.warService.query().byCurrent());
  }

  queryLog() {
    return new StockpileLogQueryBuilder(this.logRepo);
  }

  queryEntries() {
    const gameVersion = this.configService.getOrThrow<string>('APP_FOXHOLE_VERSION');
    const catalogVersion = this.configService.getOrThrow<string>('APP_CATALOG_VERSION');
    return new StockpileEntryQueryBuilder(this.currentEntryRepo, gameVersion, catalogVersion);
  }

  queryDiff(): StockpileLogDiffQueryBuilder {
    return new StockpileLogDiffQueryBuilder(this.diffRepo);
  }

  async registerStockpile(data: InsertStockpile) {
    const war = await this.warService.query().byCurrent().getOneOrFail();

    if (data.name.length > 10) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Your name is too long to create a tag. Please try again with a `short_name` in your command that is under 20 characters.',
      ).asDisplayable();
    }

    if (await this.query().byLocation({ id: data.locationId }).search(data.name).getExists()) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `A stockpile called ${data.name} is already registered at this location.`,
      ).asDisplayable();
    }

    const stockpile = this.stockpileRepo.create({ ...data, warNumber: war.warNumber });
    await this.stockpileRepo.insert(stockpile);
  }

  async registerLog(data: InsertStockpileLog) {
    const war = await this.warService.query().byCurrent().getOneOrFail();
    const log = this.logRepo.create({ ...data, warNumber: war.warNumber });
    return this.logRepo.insert(log);
  }

  async updateStockpile(data: InsertStockpileEntry[]) {
    return await this.entryRepo.insert(data);
  }

  async completeLogProcessing(logRef: SelectStockpileLog) {
    const result = await this.logRepo.update(logRef, { processedAt: new Date() });
    const log = await this.queryLog().byLog(logRef).withCrew().withGuild().getOneOrFail();

    if (log.guild.config.stockpileLogChannel) {
      const guild = await this.guildManager.fetch(log.guild.guildSf);
      const member = await guild.members.fetch(log.createdBy);

      const diff = await this.queryDiff()
        .byCurrentLog(logRef)
        .withStockpile()
        .withAccessRules()
        .withLocation()
        .withCatalog()
        .order()
        .getMany();

      const groups = groupBy(
        diff,
        (d) => `${d.stockpile.name} @ ${d.stockpile.expandedLocation.getMajorName()}`,
      );

      const prompt = new StockpileDiffPromptBuilder(await this.client.application.emojis.fetch());

      for (const [group, entries] of Object.entries(groups)) {
        prompt.displayFields(entries, {
          title: group,
          footer: {
            iconURL: member.displayAvatarURL(),
            text: `WC${log.warNumber} • Updated by ${member.displayName} and @${log.crew.shortName}`,
          },
        });
      }

      const logChannel = await guild.channels.fetch(log.guild.config.stockpileLogChannel);
      const options = prompt.build();

      if (options.embeds?.length && logChannel.isSendable()) {
        for (let count = 0; count < options.embeds.length; count += MAX_EMBEDS) {
          const { embeds, ...rest } = options;
          await logChannel.send({
            ...rest,
            embeds: embeds.slice(count, count + MAX_EMBEDS),
          });
        }
      }
    }

    return result;
  }

  async grantAccess(data: InsertStockpileAccess) {
    return await this.accessRepo.insert(data);
  }

  async revokeAccess(accessRef: SelectStockpileAccess | SelectStockpileAccess[]) {
    if (!Array.isArray(accessRef)) {
      accessRef = [accessRef];
    }

    return await this.accessRepo
      .createQueryBuilder('access')
      .update()
      .set({ deletedAt: new Date() })
      .where('access.id IN (:...access)', { access: accessRef.map((a) => a.id) })
      .execute();
  }

  async deleteStockpile(stockpileRef: SelectStockpile | SelectStockpile[], deletedBy: Snowflake) {
    if (!Array.isArray(stockpileRef)) {
      stockpileRef = [stockpileRef];
    }

    return await this.stockpileRepo
      .createQueryBuilder('stockpile')
      .update()
      .set({ deletedAt: new Date(), deletedBy })
      .where('stockpile.id IN (:...stockpiles)', { stockpiles: stockpileRef.map((s) => s.id) })
      .execute();
  }

  async deleteLog(logRef: SelectStockpileLog | SelectStockpileLog[], deletedBy: Snowflake) {
    if (!Array.isArray(logRef)) {
      logRef = [logRef];
    }

    return await this.logRepo
      .createQueryBuilder('log')
      .update()
      .set({ deletedAt: new Date(), deletedBy })
      .where('id IN (:...logs)', { logs: logRef.map((l) => l.id) })
      .execute();
  }
}
