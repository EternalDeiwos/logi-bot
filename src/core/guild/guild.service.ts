import { Injectable, Logger } from '@nestjs/common';
import { IsNull } from 'typeorm';
import {
  GuildManager,
  PermissionsBitField,
  Snowflake,
  Guild as DiscordGuild,
  User,
  GuildMember,
} from 'discord.js';
import { DiscordAPIInteraction, isDiscordAPIInteraction } from 'src/types';
import { ApiError, DatabaseError, ValidationError } from 'src/errors';
import { GuildRepository } from './guild.repository';
import { Guild, InsertGuild, SelectGuild } from './guild.entity';

@Injectable()
export class GuildService {
  private readonly logger = new Logger(GuildService.name);

  constructor(
    private readonly guildRepo: GuildRepository,
    private readonly guildManager: GuildManager,
  ) {}

  async registerGuild(guild: InsertGuild) {
    if (!guild.guildSf) {
      throw new ValidationError('MALFORMED_INPUT', { guildSf: guild.guildSf });
    }

    try {
      const result = await this.guildRepo.upsert(guild, ['guildSf', 'deletedAt']);
      if (result.identifiers.length) {
        this.logger.log(`Registered guild ${guild.name}`);
      }
      return result;
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to register guild', err);
    }
  }

  async getGuild(guild: SelectGuild) {
    try {
      return this.guildRepo.findOne({ where: guild });
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to fetch guild', err);
    }
  }

  async searchGuild(query: string, exclude?: string[]) {
    try {
      return this.guildRepo.searchByName(query, exclude);
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to search guilds', err);
    }
  }

  async deleteGuild(criteria: SelectGuild) {
    try {
      const result = await this.guildRepo.updateReturning(
        { ...criteria, deletedAt: IsNull() },
        { deletedAt: new Date() },
      );

      if (result?.affected) {
        const guild = (result?.raw as Guild[]).pop();
        this.logger.log(`Deregistered guild ${guild.name}`);
      }

      return result;
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to deregister guild', err);
    }
  }

  async setConfig(...args: Parameters<GuildRepository['setConfig']>) {
    try {
      const result = await this.guildRepo.setConfig(...args);

      if (result?.affected) {
        const guild = (result?.raw as Guild[]).pop();
        this.logger.log(`Update guild config for ${guild.name}`);
      }

      return result;
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to update guild config', err);
    }
  }

  async isGuildAdmin(guild: DiscordGuild, user: User): Promise<boolean>;
  async isGuildAdmin(guild: DiscordGuild, userId: Snowflake): Promise<boolean>;
  async isGuildAdmin(guildId: Snowflake, user: User): Promise<boolean>;
  async isGuildAdmin(guildId: Snowflake, userId: Snowflake): Promise<boolean>;
  async isGuildAdmin(member: GuildMember): Promise<boolean>;
  async isGuildAdmin(interaction: DiscordAPIInteraction): Promise<boolean>;
  async isGuildAdmin(
    maybeMember: Snowflake | DiscordGuild | GuildMember | DiscordAPIInteraction,
    user?: Snowflake | User,
  ): Promise<boolean> {
    try {
      let interaction: DiscordAPIInteraction;
      let member: GuildMember;
      let guild: DiscordGuild;

      if (maybeMember instanceof GuildMember) {
        member = maybeMember;
        guild = maybeMember.guild;
      } else if (isDiscordAPIInteraction(maybeMember)) {
        interaction = maybeMember;
        guild = await this.guildManager.fetch(interaction.guildId);
        user = interaction.member;
      } else if (typeof maybeMember === 'string') {
        guild = await this.guildManager.fetch(maybeMember);
      } else {
        guild = maybeMember;
      }

      // Guild owner short circuit
      if (guild.ownerId === (typeof user === 'string' ? user : user.id)) {
        return true;
      }

      if (!member) {
        member = await guild.members.fetch(user);
      }

      // Check member direct permissions _and_ the permissions of their highest role.
      return (
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.roles.highest.permissions.has(PermissionsBitField.Flags.Administrator)
      );
    } catch (err) {
      throw new ApiError('DISCORD_ERROR', err);
    }
  }
}
