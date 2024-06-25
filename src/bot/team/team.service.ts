import { Injectable, Logger } from '@nestjs/common';
import {
  CategoryChannel,
  Guild,
  GuildChannel,
  GuildChannelResolvable,
  GuildManager,
  GuildMember,
  Role,
  Snowflake,
  ThreadOnlyChannel,
  User,
} from 'discord.js';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/util';
import { TagService } from 'src/bot/tag/tag.service';
import { ForumTagTemplate } from 'src/bot/tag/tag-template.entity';
import { TagTemplateRepository } from 'src/bot/tag/tag-template.repository';
import { TeamRepository } from './team.repository';
import { Team } from './team.entity';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly guildManager: GuildManager,
    private readonly tagService: TagService,
    private readonly templateRepo: TagTemplateRepository,
    private readonly teamRepo: TeamRepository,
  ) {}

  async resolveTeamGuild(team: Team): Promise<OperationStatus<Guild>> {
    try {
      const guild = await this.guildManager.fetch(team.guild);
      return new OperationStatus({ success: true, message: 'Done', data: guild });
    } catch (err) {
      this.logger.error(`Failed to resolve guild: ${err.message}`, err.stack);
      return {
        success: false,
        message: 'Guild is improperly registered. Please report this incident.',
      };
    }
  }

  async resolveTeamCategory(team: Team): Promise<OperationStatus<CategoryChannel>> {
    const { data: guild, ...guildResult } = await this.resolveTeamGuild(team);

    if (!guildResult.success) {
      return guildResult;
    }

    try {
      const category = await guild.channels.fetch(team.category);

      if (!category) {
        return {
          success: false,
          message: `${team.name} does not have a category. Please report this incident.`,
        };
      }

      return new OperationStatus({
        success: true,
        message: 'Done',
        data: category as CategoryChannel,
      });
    } catch (err) {
      this.logger.error(
        `Failed to fetch category ${team.category} for ${team.name} in ${guild.name}: ${err.message}`,
        err.stack,
      );
      return {
        success: false,
        message: `${team.name} does not have a ticket category. Please report this incident.`,
      };
    }
  }

  async resolveTeamForum(team: Team): Promise<OperationStatus<ThreadOnlyChannel>> {
    const { data: guild, ...guildResult } = await this.resolveTeamGuild(team);

    if (!guildResult.success) {
      return guildResult;
    }

    try {
      const forum = await guild.channels.fetch(team.forum);

      if (!forum || !forum.isThreadOnly()) {
        return {
          success: false,
          message: `${team.name} does not have a ticket forum. Please report this incident.`,
        };
      }

      return new OperationStatus({ success: true, message: 'Done', data: forum });
    } catch (err) {
      this.logger.error(
        `Failed to fetch forum ${team.forum} for ${team.name} in ${guild.name}: ${err.message}`,
        err.stack,
      );
      return {
        success: false,
        message: `${team.name} does not have a ticket forum. Please report this incident.`,
      };
    }
  }

  async registerTeam(
    forum: GuildChannel,
    role: GuildMember | Role | User,
    member: GuildMember,
  ): Promise<OperationStatus<string>> {
    if (!member.permissions.has('Administrator')) {
      return { success: false, message: 'Only guild administrators can perform this action' };
    }

    if (!forum.isThreadOnly()) {
      return { success: false, message: `${forum} is not a valid forum` };
    }

    if ('roles' in role || 'username' in role) {
      return { success: false, message: `${role} is not a valid role` };
    }

    const category = await forum.parent.fetch();

    if (await this.teamRepo.exists({ where: { category: category.id } })) {
      return { success: false, message: `${category.name} is already a registered team` };
    }

    const {
      identifiers: [{ id: teamId }],
    } = await this.teamRepo.insert({
      name: category.name,
      category: category.id,
      guild: category.guildId,
      forum: forum.id,
      role: role.id,
    });

    return new OperationStatus({ success: true, message: 'Done', data: teamId });
  }

  async deleteTeam(category: GuildChannel, member: GuildMember): Promise<OperationStatus> {
    if (!member.permissions.has('Administrator')) {
      return { success: false, message: 'Only guild administrators can perform this action' };
    }

    await this.teamRepo.delete({
      category: category.id,
    });

    return OperationStatus.SUCCESS;
  }

  async updateTeam(
    categoryRef: GuildChannelResolvable,
    member: GuildMember,
    audit: GuildChannel,
  ): Promise<OperationStatus> {
    if (!member.permissions.has('Administrator')) {
      return { success: false, message: 'Only guild administrators can perform this action' };
    }

    const guild = member.guild;
    const category = await guild.channels.cache.get(
      typeof categoryRef === 'string' ? categoryRef : categoryRef.id,
    );

    if (!category) {
      return { success: false, message: 'Invalid channel' };
    }

    await this.teamRepo.update({ category: category.id }, { audit: audit.id });

    return OperationStatus.SUCCESS;
  }

  async reconcileGuildForumTags(guildId: Snowflake): Promise<OperationStatus> {
    const guild = await this.guildManager.fetch(guildId);
    const templates = await this.templateRepo.find({ where: { guild: guildId } });
    const teams = await this.teamRepo.find({ where: { guild: guildId } });

    const result = await Promise.all(
      teams.map((team) => this.reconcileTeamForumTags(guild, team, templates)),
    );

    const failed = result.filter((r) => !r.success);

    if (failed.length) {
      const message = failed.map((r) => `- ${r.message}`).join('\n');
      return { success: false, message };
    }

    return OperationStatus.SUCCESS;
  }

  async reconcileTeamForumTags(
    guild: Guild,
    team: Team,
    templates: ForumTagTemplate[],
  ): Promise<OperationStatus> {
    const tags = await team.tags;
    const filteredTemplates = templates.filter((template) => {
      return (
        // Crew tags only appear on their team's forum
        (!template.channel || template.crew?.forum === team.forum) &&
        // Don't create tags that already exist
        !tags.find((tag) => template.id === tag.templateId)
      );
    });

    return this.tagService.addTags(guild, team, filteredTemplates);
  }
}
