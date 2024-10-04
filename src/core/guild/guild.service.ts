import { Injectable, Logger } from '@nestjs/common';
import { InsertResult } from 'typeorm';
import { Snowflake } from 'discord.js';
import { GuildRepository } from './guild.repository';
import { Guild, InsertGuild } from './guild.entity';
import { GuildQueryBuilder } from './guild.query';

export abstract class GuildService {
  abstract query(): GuildQueryBuilder;
  abstract registerGuild(guild: InsertGuild): Promise<InsertResult>;
  abstract updateGuild(guildRef: Snowflake, guild: InsertGuild): Promise<Guild>;
  abstract setConfig(...args: Parameters<GuildRepository['setConfig']>): Promise<Guild>;
}

@Injectable()
export class GuildServiceImpl extends GuildService {
  private readonly logger = new Logger(GuildService.name);

  constructor(private readonly guildRepo: GuildRepository) {
    super();
  }

  query() {
    return new GuildQueryBuilder(this.guildRepo);
  }

  async registerGuild(guild: InsertGuild) {
    return this.guildRepo.upsert(guild, ['guildSf', 'deletedAt']);
  }

  async updateGuild(guildRef: Snowflake, guild: InsertGuild) {
    const result = await this.guildRepo.updateReturning({ guildSf: guildRef }, guild);
    if (result?.affected) {
      const guild = (result?.raw as Guild[]).pop();
      this.logger.log(`Update guild config for ${guild.name}`);
      return guild;
    }
  }

  async setConfig(...args: Parameters<GuildRepository['setConfig']>) {
    const result = await this.guildRepo.setConfig(...args);
    if (result?.affected) {
      const guild = (result?.raw as Guild[]).pop();
      this.logger.log(`Update guild config for ${guild.name}`);
      return guild;
    }
  }
}
