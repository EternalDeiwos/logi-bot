import { Injectable, Logger } from '@nestjs/common';
import { InsertResult } from 'typeorm';
import { Snowflake } from 'discord.js';
import { GuildRepository } from './guild.repository';
import { Guild, InsertGuild, SelectGuild } from './guild.entity';

export abstract class GuildService {
  abstract getGuild(guild: SelectGuild): Promise<Guild>;
  abstract registerGuild(guild: InsertGuild): Promise<InsertResult>;
  abstract searchGuild(query: string, exclude?: string): Promise<Guild[]>;
  abstract updateGuild(guildRef: Snowflake, guild: InsertGuild): Promise<Guild>;
  abstract setConfig(...args: Parameters<GuildRepository['setConfig']>): Promise<Guild>;
}

@Injectable()
export class GuildServiceImpl extends GuildService {
  private readonly logger = new Logger(GuildService.name);

  constructor(private readonly guildRepo: GuildRepository) {
    super();
  }

  async getGuild(guild: SelectGuild) {
    return this.guildRepo.findOneByOrFail(guild);
  }

  async registerGuild(guild: InsertGuild) {
    return this.guildRepo.upsert(guild, ['guild']);
  }

  async searchGuild(query: string, exclude?: string) {
    return this.guildRepo.searchByName(query, exclude);
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
