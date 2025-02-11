import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { DeleteResult, InsertResult } from 'typeorm';
import { TagService } from 'src/core/tag/tag.service';
import { ForumTagTemplate } from 'src/core/tag/tag-template.entity';
import { SelectGuildDto } from 'src/core/guild/guild.entity';
import { TeamRepository } from './team.repository';
import { InsertTeam, SelectTeam, Team } from './team.entity';
import { TeamQueryBuilder } from './team.query';

export abstract class TeamService {
  abstract query(): TeamQueryBuilder;
  abstract registerTeam(team: InsertTeam): Promise<InsertResult>;
  abstract deleteTeam(team: SelectTeam): Promise<DeleteResult>;
  abstract reconcileGuildForumTags(guild: SelectGuildDto): Promise<void>;
  abstract reconcileTeamForumTags(
    teamRef: SelectTeam,
    templates: ForumTagTemplate[],
  ): Promise<void>;
}

@Injectable()
export class TeamServiceImpl extends TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    @Inject(forwardRef(() => TagService)) private readonly tagService: TagService,
    private readonly teamRepo: TeamRepository,
  ) {
    super();
  }

  query(): TeamQueryBuilder {
    return new TeamQueryBuilder(this.teamRepo);
  }

  async registerTeam(team: InsertTeam) {
    return this.teamRepo.upsert(team, ['name', 'guildId', 'deletedAt']);
  }

  async deleteTeam(teamRef: SelectTeam) {
    const team = await this.query().byTeam(teamRef).withTags().getOneOrFail();
    await this.tagService.deleteTags(team.tags);
    return await this.teamRepo.updateReturning(teamRef, { deletedAt: new Date() });
  }

  async reconcileGuildForumTags(guildRef: SelectGuildDto) {
    const templates = await this.tagService
      .queryTemplate()
      .byGuild(guildRef)
      .withCrews()
      .withCrewTeams()
      .getMany();
    const teams = await this.query().byGuild(guildRef).withTags().getMany();
    const result = await Promise.all(
      teams.map((team) => this._reconcileTeamForumTags(team, templates)),
    );
  }

  async reconcileTeamForumTags(teamRef: SelectTeam, templates: ForumTagTemplate[]) {
    const team = await this.query().byTeam(teamRef).withTags().getOneOrFail();
    return this._reconcileTeamForumTags(team, templates);
  }

  private async _reconcileTeamForumTags(team: Team, templates: ForumTagTemplate[]) {
    const filteredTemplates = templates.filter((template) => {
      return (
        // Crew tags only appear on their team's forum
        (!template.crewId || template.crew?.team?.id === team.id) &&
        // Don't create tags that already exist
        !team.tags.find((tag) => template.id === tag.templateId)
      );
    });

    return this.tagService.addTags(team, filteredTemplates);
  }
}
