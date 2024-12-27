import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { GuildMember, GuildForumTag, GuildManager, Snowflake } from 'discord.js';
import { DeleteResult, In, InsertResult } from 'typeorm';
import { compact } from 'lodash';
import { InternalError, ValidationError } from 'src/errors';
import { Crew } from 'src/core/crew/crew.entity';
import { SelectTeam } from 'src/core/team/team.entity';
import { TeamService } from 'src/core/team/team.service';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { GuildService } from 'src/core/guild/guild.service';
import { ForumTagTemplate } from './tag-template.entity';
import { TagTemplateRepository } from './tag-template.repository';
import { TagRepository } from './tag.repository';
import { ForumTag, SelectTag } from './tag.entity';
import { TagQueryBuilder } from './tag.query';
import { TemplateQueryBuilder } from './tag-template.query';

export enum TicketTag {
  TRIAGE = 'Triage',
  ACCEPTED = 'Accepted',
  DECLINED = 'Declined',
  REPEATABLE = 'Repeatable',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
  MOVED = 'Moved',
  ABANDONED = 'Abandoned',
}

export abstract class TagService {
  abstract queryTag(): TagQueryBuilder;
  abstract queryTemplate(): TemplateQueryBuilder;
  abstract createTicketTags(guildRef: SelectGuild, memberRef: Snowflake): Promise<InsertResult[]>;
  abstract createTagForCrew(crew: Crew): Promise<any>;
  abstract createTag(
    guildRef: SelectGuild,
    memberRef: Snowflake,
    name: string,
    moderated?: boolean,
  ): Promise<any>;
  abstract addTags(teamRef: SelectTeam, templates: ForumTagTemplate[]): Promise<void>;
  abstract deleteTags(tagRef: SelectTag | SelectTag[]): Promise<DeleteResult>;
  abstract deleteTagsByTemplate(
    guildRef: SelectGuild,
    templates?: (ForumTagTemplate | string)[],
  ): Promise<any>;
  abstract deleteTagTemplates(
    member: GuildMember,
    templates?: (ForumTagTemplate | string)[],
  ): Promise<any>;
}

@Injectable()
export class TagServiceImpl extends TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly guildService: GuildService,
    @Inject(forwardRef(() => TeamService)) private readonly teamService: TeamService,
    private readonly tagRepo: TagRepository,
    private readonly templateRepo: TagTemplateRepository,
  ) {
    super();
  }

  queryTag(): TagQueryBuilder {
    return new TagQueryBuilder(this.tagRepo);
  }

  queryTemplate(): TemplateQueryBuilder {
    return new TemplateQueryBuilder(this.templateRepo);
  }

  async createTicketTags(guildRef: SelectGuild, memberRef: Snowflake) {
    const guild = await this.guildService.query().byGuild(guildRef).getOneOrFail();

    const triage = {
      name: TicketTag.TRIAGE,
      guildId: guild.id,
      moderated: true,
      default: true,
      createdBy: memberRef,
    };

    const accepted = {
      name: TicketTag.ACCEPTED,
      guildId: guild.id,
      moderated: true,
      createdBy: memberRef,
    };

    const declined = {
      name: TicketTag.DECLINED,
      guildId: guild.id,
      moderated: true,
      createdBy: memberRef,
    };

    const moved = {
      name: TicketTag.MOVED,
      guildId: guild.id,
      moderated: true,
      createdBy: memberRef,
    };

    const unmoderated = [
      TicketTag.ABANDONED,
      TicketTag.DONE,
      TicketTag.IN_PROGRESS,
      TicketTag.REPEATABLE,
    ].map((name) => ({
      name,
      guildId: guild.id,
      moderated: false,
      createdBy: memberRef,
    }));
    const tags = [triage, accepted, declined, moved].concat(unmoderated);

    return compact(
      await Promise.all(
        tags.map(async (tag) => {
          try {
            return await this.templateRepo.insert(tag);
          } catch {
            this.logger.warn(`${tag.name} tag already exists`);
          }
        }),
      ),
    );
  }

  async createTagForCrew(crew: Crew) {
    if (!crew) {
      throw new ValidationError('VALIDATION_FAILED', 'Invalid crew');
    }

    return await this.templateRepo.insert({
      name: crew.shortName,
      guildId: crew.guildId,
      crewId: crew.id,
      createdBy: crew.createdBy,
      moderated: true,
    });
  }

  async createTag(guildRef: SelectGuild, memberRef: Snowflake, name: string, moderated = false) {
    const guild = await this.guildService.query().byGuild(guildRef).getOneOrFail();

    return await this.templateRepo.upsert(
      {
        name: name,
        guildId: guild.id,
        moderated,
        createdBy: memberRef,
      },
      ['name', 'guildId'],
    );
  }

  async addTags(teamRef: SelectTeam, templates: ForumTagTemplate[]) {
    const team = await this.teamService.query().byTeam(teamRef).getOneOrFail();
    const discordGuild = await this.guildManager.fetch(team.guild.guildSf);
    const forum = await discordGuild.channels.fetch(team.forumSf);

    if (!forum || !forum.isThreadOnly()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid forum');
    }

    const oldTags = forum.availableTags.concat();
    const tagsToCreate = templates.filter(
      (template) => oldTags.findIndex((old) => template.name === old.name) === -1,
    );
    const payload = [
      ...oldTags,
      ...tagsToCreate.map((template) => ({
        name: template.name,
        moderated: template.moderated,
        default: template.default,
      })),
    ];

    if (payload.length > 20) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Too many forum tags. Must be 20 or fewer.',
      ).asDisplayable();
    }

    const updatedForum = await forum.setAvailableTags(payload);

    const tagsToRegister = updatedForum.availableTags.reduce(
      (accumulator, tag) => {
        const template = templates.find((template) => tag.name === template.name);
        if (template) {
          accumulator.push([template, tag]);
        }
        return accumulator;
      },
      [] as [ForumTagTemplate, GuildForumTag][],
    );

    await this.tagRepo.upsert(
      tagsToRegister.map(([template, tag]) => ({
        tagSf: tag.id,
        name: tag.name,
        guildId: team.guildId,
        teamId: team.id,
        templateId: template.id,
      })),
      { conflictPaths: ['templateId', 'teamId'], skipUpdateIfNoValuesChanged: true },
    );
  }

  async deleteTags(tagRef: SelectTag | SelectTag[]): Promise<DeleteResult> {
    const tags = Array.isArray(tagRef) ? tagRef.map((tag) => tag.tagSf) : tagRef;
    return await this.tagRepo.delete(tags);
  }

  async deleteTagsByTemplate(guildRef: SelectGuild, templates?: (ForumTagTemplate | string)[]) {
    const guild = await this.guildService.query().byGuild(guildRef).getOneOrFail();
    const discordGuild = await this.guildManager.fetch(guild.guildSf);

    if (!templates || !Array.isArray(templates)) {
      templates = await this.templateRepo.find({
        where: { guildId: guild.id },
      });
    }

    const result = await this.templateRepo.getTemplateTagForumMap(templates);

    const results = await Promise.all(
      result.map(async ({ teamId, tags }) => {
        const team = await this.teamService.query().byTeam({ id: teamId }).getOneOrFail();
        const forum = await discordGuild.channels.fetch(team.forumSf);

        if (!forum || !forum.isThreadOnly()) {
          throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid forum');
        }

        const remaining = forum.availableTags.filter((t) => !Object.values(tags).includes(t.id));
        await forum.setAvailableTags(remaining);

        return await this.tagRepo.delete({
          templateId: In(
            templates.map((template) => (typeof template === 'string' ? template : template?.id)),
          ),
        });
      }),
    );
  }

  async deleteTagTemplates(member: GuildMember, templates?: (ForumTagTemplate | string)[]) {
    const guild = member.guild;

    if (!templates || !Array.isArray(templates)) {
      templates = await this.templateRepo.find({
        where: { guildId: guild.id },
      });
    }

    return await this.templateRepo.delete(
      templates.map((template) => (typeof template === 'string' ? template : template?.id)),
    );
  }
}
