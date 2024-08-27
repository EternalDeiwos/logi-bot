import { Injectable, Logger } from '@nestjs/common';
import {
  CategoryChannel,
  channelMention,
  Guild,
  GuildChannel,
  GuildChannelResolvable,
  GuildMember,
  Role,
  Snowflake,
  ThreadOnlyChannel,
  User,
} from 'discord.js';
// import { TagService } from 'src/core/tag/tag.service';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { GuildService } from 'src/core/guild/guild.service';
import { ForumTagTemplate } from 'src/core/tag/tag-template.entity';
import { DatabaseError, ValidationError } from 'src/errors';
import { TeamRepository } from './team.repository';
import { InsertTeam, SelectTeam, Team } from './team.entity';
import { InsertResult } from 'typeorm';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    // private readonly tagService: TagService,
    private readonly guildService: GuildService,
    private readonly teamRepo: TeamRepository,
  ) {}

  async registerTeam(team: InsertTeam): Promise<InsertResult>;
  async registerTeam(team: InsertTeam, guildRef: SelectGuild): Promise<InsertResult>;
  async registerTeam(team: InsertTeam, guildRef?: SelectGuild): Promise<InsertResult> {
    if (!team.guildId && (guildRef?.guildSf || guildRef?.id)) {
      const guild = await this.guildService.getGuild(guildRef);
      team.guildId = guild.id;
    }

    if (!team.guildId || !team.categorySf || !team.forumSf || !team.roleSf) {
      throw new ValidationError('MALFORMED_INPUT', { team });
    }

    try {
      const result = await this.teamRepo.upsert(team, ['name', 'guildId']);
      if (result.identifiers.length) {
        this.logger.log(`Registered team ${team.name}`);
      }
      return result;
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to register team', err);
    }
  }

  async deleteTeam(teamRef: SelectTeam) {
    try {
      const result = await this.teamRepo.updateReturning(teamRef, { deletedAt: new Date() });

      if (result?.affected) {
        const team = (result?.raw as Team[]).pop();
        this.logger.log(`Deregistered team ${team.name}`);
      }

      return result;
    } catch (err) {
      throw new DatabaseError('QUERY_FAILED', 'Failed to delete team', err);
    }
  }

  // async reconcileGuildForumTags(guildId: Snowflake): Promise<OperationStatus> {
  //   const guild = await this.guildManager.fetch(guildId);
  //   const templates = await this.templateRepo.find({ where: { guild: guildId } });
  //   const teams = await this.teamRepo.find({ where: { guild: guildId } });

  //   const result = await Promise.all(
  //     teams.map((team) => this.reconcileTeamForumTags(guild, team, templates)),
  //   );

  //   const failed = result.filter((r) => !r.success);

  //   if (failed.length) {
  //     const message = failed.map((r) => `- ${r.message}`).join('\n');
  //     return { success: false, message };
  //   }

  //   return OperationStatus.SUCCESS;
  // }

  // async reconcileTeamForumTags(
  //   guild: Guild,
  //   team: Team,
  //   templates: ForumTagTemplate[],
  // ): Promise<OperationStatus> {
  //   const tags = await team.tags;
  //   const filteredTemplates = templates.filter((template) => {
  //     return (
  //       // Crew tags only appear on their team's forum
  //       (!template.channel || template.crew?.forum === team.forum) &&
  //       // Don't create tags that already exist
  //       !tags.find((tag) => template.id === tag.templateId)
  //     );
  //   });

  //   return this.tagService.addTags(guild, team, filteredTemplates);
  // }
}
