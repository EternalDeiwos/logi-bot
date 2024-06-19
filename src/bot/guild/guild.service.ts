import { Injectable, Logger } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { Snowflake } from 'discord.js';
import { ConfigService } from 'src/config';
import { GuildRepository } from './guild.repository';
import { Guild } from './guild.entity';

@Injectable()
export class GuildService {
  private readonly logger = new Logger(GuildService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly guildRepo: GuildRepository,
  ) {}

  async registerGuild(guild: Omit<Guild, 'createdAt'>) {
    if (await this.existsGuild(guild.guild)) {
      return { success: true, message: 'Done' };
    }

    await this.guildRepo.insert(guild);

    return { success: true, message: 'Done' };
  }

  async existsGuild(guildId: Snowflake) {
    return this.guildRepo.exists({ where: { guild: guildId } });
  }

  async searchGuild(query: string, exclude?: string) {
    return this.guildRepo.searchByName(query, exclude);
  }

  async updateGuild(guildId: Snowflake, guild: DeepPartial<Guild>) {
    const result = await this.guildRepo.update({ guild: guildId }, guild);
    if (result.affected) {
      return { success: true, message: 'Done' };
    }

    return { success: false, message: 'No change to guild' };
  }
}
