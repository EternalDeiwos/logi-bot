import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Guild, GuildMember, GuildForumTag, PermissionsBitField, GuildManager } from 'discord.js';
import { In } from 'typeorm';
import _ from 'lodash';
import { InternalError, ValidationError } from 'src/errors';
import { Crew } from 'src/core/crew/crew.entity';
import { SelectTeam } from 'src/core/team/team.entity';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { ForumTagTemplate } from './tag-template.entity';
import { TagTemplateRepository } from './tag-template.repository';
import { TagRepository } from './tag.repository';
import { TeamService } from '../team/team.service';

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
  abstract createTicketTags(
    member: GuildMember,
  ): Promise<{ success: boolean; message: string } | any[]>;
  abstract createTagForCrew(crew: Crew): Promise<any>;
  abstract createTag(name: string, member: GuildMember, moderated?: boolean): Promise<any>;
  abstract addTags(
    guildRef: SelectGuild,
    teamRef: SelectTeam,
    templates: ForumTagTemplate[],
  ): Promise<void>;
  abstract deleteTags(member: GuildMember, templates?: (ForumTagTemplate | string)[]): Promise<any>;
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
    @Inject(forwardRef(() => TeamService)) private readonly teamService: TeamService,
    private readonly tagRepo: TagRepository,
    private readonly templateRepo: TagTemplateRepository,
  ) {
    super();
  }

  async createTicketTags(member: GuildMember) {
    if (!member.permissions.has('Administrator')) {
      return { success: false, message: 'Only guild administrators can perform this action' };
    }
    const guild = member.guild;

    const triage = {
      name: TicketTag.TRIAGE,
      guild: guild.id,
      moderated: true,
      default: true,
      createdBy: member.id,
    };

    const accepted = {
      name: TicketTag.ACCEPTED,
      guild: guild.id,
      moderated: true,
      createdBy: member.id,
    };

    const declined = {
      name: TicketTag.DECLINED,
      guild: guild.id,
      moderated: true,
      createdBy: member.id,
    };

    const moved = {
      name: TicketTag.MOVED,
      guild: guild.id,
      moderated: true,
      createdBy: member.id,
    };

    const unmoderated = [
      TicketTag.ABANDONED,
      TicketTag.DONE,
      TicketTag.IN_PROGRESS,
      TicketTag.REPEATABLE,
    ].map((name) => ({
      name,
      guild: guild.id,
      moderated: false,
      createdBy: member.id,
    }));
    const tags = [triage, accepted, declined, moved].concat(unmoderated);

    return _.compact(
      await Promise.all(
        tags.map(async (tag) => {
          try {
            return await this.templateRepo.insert(tag);
          } catch {
            this.logger.warn(`${tag.name} already exists`);
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
      guild: crew.guild,
      channel: crew.channel,
      createdBy: crew.createdBy,
      moderated: true,
    });
  }

  async createTag(name: string, member: GuildMember, moderated = false) {
    const guild = member.guild;

    return await this.templateRepo.insert({
      name: name,
      guild: guild.id,
      moderated,
      createdBy: member.id,
    });
  }

  async addTags(guildRef: SelectGuild, teamRef: SelectTeam, templates: ForumTagTemplate[]) {
    const team = await this.teamService.getTeam(teamRef);
    const guild = await this.guildManager.fetch(guildRef.guild);
    const forum = await guild.channels.fetch(team.forum);

    if (!forum || !forum.isThreadOnly()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid forum');
    }

    const updatedForum = await forum.setAvailableTags([
      ...forum.availableTags.concat(),
      ...templates.map((template) => ({
        name: template.name,
        moderated: template.moderated,
        default: template.default,
      })),
    ]);

    const newTags = updatedForum.availableTags.reduce(
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
      newTags.map(([template, tag]) => ({
        tag: tag.id,
        name: tag.name,
        guild: guildRef.guild,
        forum: forum.id,
        templateId: template.id,
      })),
      { conflictPaths: { templateId: true, forum: true }, skipUpdateIfNoValuesChanged: true },
    );
  }

  async deleteTags(member: GuildMember, templates?: (ForumTagTemplate | string)[]) {
    if (!member.permissions.has('Administrator')) {
      return { success: false, message: 'Only guild administrators can perform this action' };
    }

    const guild = member.guild;

    if (!templates || !Array.isArray(templates)) {
      templates = await this.templateRepo.find({
        where: { guild: guild.id },
      });
    }

    const result = await this.templateRepo
      .createQueryBuilder('template')
      .distinctOn(['tag.forum'])
      .select('tag.forum', 'forum')
      .addSelect('jsonb_object_agg(tag.name, tag.tag_sf::varchar)', 'tags')
      .leftJoin('template.tags', 'tag')
      .where('tag.template IN (:...ids)', {
        ids: templates.map((template) => (typeof template === 'string' ? template : template?.id)),
      })
      .groupBy('tag.forum')
      .getRawMany<{
        forum: string;
        tags: Record<string, string>;
      }>();

    const results = await Promise.all(
      result.map(async ({ forum: forumRef, tags }) => {
        const forum = await guild.channels.fetch(forumRef);

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
        where: { guild: guild.id },
      });
    }

    return await this.templateRepo.delete(
      templates.map((template) => (typeof template === 'string' ? template : template?.id)),
    );
  }
}
