import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { GuildManager } from 'discord.js';
import { DeleteResult, InsertResult } from 'typeorm';
import { InternalError } from 'src/errors';
import { BotService } from 'src/bot/bot.service';
import { DiscordService } from 'src/bot/discord.service';
import { TagService } from 'src/core/tag/tag.service';
import { ForumTagTemplate } from 'src/core/tag/tag-template.entity';
import { TagTemplateRepository } from 'src/core/tag/tag-template.repository';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { GuildService } from 'src/core/guild/guild.service';
import { TeamRepository } from './team.repository';
import { InsertTeam, SelectTeam, Team } from './team.entity';

export abstract class TeamService {
  abstract getTeam(team: SelectTeam): Promise<Team>;
  abstract registerTeam(team: InsertTeam): Promise<InsertResult>;
  abstract deleteTeam(team: SelectTeam): Promise<DeleteResult>;
  abstract reconcileGuildForumTags(guild: SelectGuild): Promise<void>;
  abstract reconcileTeamForumTags(
    teamRef: SelectTeam,
    templates: ForumTagTemplate[],
  ): Promise<void>;
}

@Injectable()
export class TeamServiceImpl extends TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly botService: BotService,
    private readonly discordService: DiscordService,
    @Inject(forwardRef(() => TagService)) private readonly tagService: TagService,
    private readonly templateRepo: TagTemplateRepository,
    private readonly teamRepo: TeamRepository,
  ) {
    super();
  }

  async getTeam(team: SelectTeam) {
    return this.teamRepo.findOneOrFail({ where: team });
  }

  async getTeamByGuild(guildRef: SelectGuild) {
    return this.teamRepo.find({ where: { guild: guildRef } });
  }

  async registerTeam(team: InsertTeam) {
    return this.teamRepo.upsert(team, ['name', 'guildId', 'deletedAt']);
  }

  async deleteTeam(team: SelectTeam) {
    return await this.teamRepo.updateReturning(team, { deletedAt: new Date() });
  }

  async reconcileGuildForumTags(guildRef: SelectGuild) {
    const templates = await this.tagService.getTemplateByGuild(guildRef);
    const teams = await this.teamRepo.find({ where: { guild: guildRef } });

    const result = await Promise.all(
      teams.map((team) => this.reconcileTeamForumTags(team, templates)),
    );
  }

  async reconcileTeamForumTags(teamRef: SelectTeam, templates: ForumTagTemplate[]) {
    const team: Team = teamRef instanceof Team ? teamRef : await this.getTeam(teamRef);
    const tags = await team.tags;
    const filteredTemplates = templates.filter((template) => {
      return (
        // Crew tags only appear on their team's forum
        (!template.crewSf || template.crew?.team?.id === team.id) &&
        // Don't create tags that already exist
        !tags.find((tag) => template.id === tag.templateId)
      );
    });

    return this.tagService.addTags(teamRef, filteredTemplates);
  }
}
