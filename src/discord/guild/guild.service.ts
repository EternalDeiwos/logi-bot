import { Injectable, Logger } from '@nestjs/common';
import { GuildRepository } from './guild.repository';
import { Guild, InsertGuild } from './guild.entity';
import { DatabaseError, DiscordError } from 'src/errors';

@Injectable()
export class GuildService {
  private readonly logger = new Logger(GuildService.name);

  constructor(private readonly guildRepo: GuildRepository) {}

  async registerGuild(guild: InsertGuild) {
    if (!guild.guildId) {
      throw new DiscordError('MALFORMED_INPUT', { guildId: guild.guildId });
    }

    try {
      const result = await this.guildRepo.upsert(guild, ['guildId', 'deletedAt']);
      if (result.identifiers.length) {
        this.logger.log(`Registered guild ${guild.name}`);
      }
      return result;
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to register guild', err);
    }
  }

  async searchGuild(query: string, exclude?: string[]) {
    try {
      return this.guildRepo.searchByName(query, exclude);
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to search guilds', err);
    }
  }

  async deleteGuildById(id: Guild['id']) {
    try {
      return this.guildRepo.softDelete({ id });
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to deregister guild', err);
    }
  }

  async deleteGuildBySf(guildId: Guild['guildId']) {
    return this.guildRepo.softDelete({ guildId });
  }
}
