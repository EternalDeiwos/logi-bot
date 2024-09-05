import { Injectable, Logger } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { Snowflake } from 'discord.js';
import { OperationStatus } from 'src/util';
import { GuildRepository } from './guild.repository';
import { Guild } from './guild.entity';

@Injectable()
export class GuildService {
  private readonly logger = new Logger(GuildService.name);

  constructor(private readonly guildRepo: GuildRepository) {}

  async registerGuild(guild: Omit<Guild, 'createdAt'>) {
    if (await this.existsGuild(guild.guild)) {
      return OperationStatus.SUCCESS;
    }

    await this.guildRepo.insert(guild);

    return OperationStatus.SUCCESS;
  }

  async existsGuild(guildRef: Snowflake) {
    return this.guildRepo.exists({ where: { guild: guildRef } });
  }

  async searchGuild(query: string, exclude?: string) {
    return this.guildRepo.searchByName(query, exclude);
  }

  async updateGuild(guildRef: Snowflake, guild: DeepPartial<Guild>) {
    const result = await this.guildRepo.update({ guild: guildRef }, guild);
    if (result.affected) {
      return OperationStatus.SUCCESS;
    }

    return { success: false, message: 'No change to guild' };
  }
}
