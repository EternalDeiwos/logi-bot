import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guild, GuildChannel, GuildChannelResolvable, GuildMember, Role, User } from 'discord.js';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/types';
import { TagService } from 'src/bot/tag/tag.service';
import { ForumTagTemplate } from 'src/bot/tag/tag-template.entity';
import { Team } from './team.entity';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tagService: TagService,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
  ) {}

  async getTeam(categoryRef: GuildChannelResolvable) {
    return this.teamRepo.findOne({
      where: { category: typeof categoryRef === 'string' ? categoryRef : categoryRef.id },
    });
  }

  async getTeams(guild: Guild) {
    return this.teamRepo.find({
      where: { guild: guild.id },
    });
  }

  async searchTeam(guild: Guild, query: string) {
    return this.teamRepo
      .createQueryBuilder('team')
      .where(`guild_sf = :guild AND name ILIKE :query`, { guild: guild.id, query: `%${query}%` })
      .getMany();
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

    return { success: true, message: 'Done', data: teamId };
  }

  async deleteTeam(category: GuildChannel, member: GuildMember): Promise<OperationStatus> {
    if (!member.permissions.has('Administrator')) {
      return { success: false, message: 'Only guild administrators can perform this action' };
    }

    await this.teamRepo.delete({
      category: category.id,
    });

    return { success: true, message: 'Done' };
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

    return { success: true, message: 'Done' };
  }

  async reconcileGuildForumTags(guild: Guild): Promise<OperationStatus> {
    const templates = await this.tagService.getTemplates(guild);
    const teams = await this.getTeams(guild);

    const result = await Promise.all(
      teams.map((team) => this.reconcileTeamForumTags(guild, team, templates)),
    );

    const failed = result.filter((r) => !r.success);

    if (failed.length) {
      const message = failed.map((r) => `- ${r.message}`).join('\n');
      return { success: false, message };
    }

    return { success: true, message: 'Done' };
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
