import { Injectable, Logger } from '@nestjs/common';
import { Guild, GuildMember, GuildForumTag, Snowflake } from 'discord.js';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/util';
import { Crew } from 'src/bot/crew/crew.entity';
import { Team } from 'src/bot/team/team.entity';
import { ForumTagTemplate } from './tag-template.entity';
import { TagTemplateRepository } from './tag-template.repository';
import { TagRepository } from './tag.repository';
import { In } from 'typeorm';

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

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tagRepo: TagRepository,
    private readonly templateRepo: TagTemplateRepository,
  ) {}

  async createTicketTags(member: GuildMember): Promise<OperationStatus> {
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

    for (const tag of tags) {
      try {
        await this.templateRepo.insert(tag);
      } catch {
        this.logger.warn(`${tag.name} already exists`);
      }
    }

    return OperationStatus.SUCCESS;
  }

  async createTagForCrew(crew: Crew): Promise<OperationStatus> {
    if (!crew) {
      return { success: false, message: `Invalid crew` };
    }

    try {
      await this.templateRepo.insert({
        name: crew.shortName,
        guild: crew.guild,
        channel: crew.channel,
        createdBy: crew.createdBy,
        moderated: true,
      });
    } catch {
      return { success: false, message: 'A tag with this name already exists' };
    }

    return OperationStatus.SUCCESS;
  }

  async createTag(name: string, member: GuildMember, moderated = false): Promise<OperationStatus> {
    if (!member.permissions.has('Administrator')) {
      return { success: false, message: 'Only guild administrators can perform this action' };
    }
    const guild = member.guild;

    try {
      await this.templateRepo.insert({
        name: name,
        guild: guild.id,
        moderated,
        createdBy: member.id,
      });
    } catch {
      return { success: false, message: 'A tag with this name already exists' };
    }

    return OperationStatus.SUCCESS;
  }

  async addTags(guild: Guild, team: Team, templates: ForumTagTemplate[]): Promise<OperationStatus> {
    if (!team) {
      return { success: false, message: `Invalid team` };
    }

    const forum = await guild.channels.fetch(team.forum);

    if (!forum.isThreadOnly()) {
      return { success: false, message: `${forum} is not a forum` };
    }

    try {
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
          guild: guild.id,
          forum: forum.id,
          templateId: template.id,
        })),
        { conflictPaths: { templateId: true, forum: true }, skipUpdateIfNoValuesChanged: true },
      );
    } catch (err) {
      this.logger.error(`Failed to set tags for ${team.name}: ${err.message}`);
      return {
        success: false,
        message: `Unable to set forum tags for ${forum}. Please remove existing tags and try again.`,
      };
    }

    return OperationStatus.SUCCESS;
  }

  async deleteTags(
    member: GuildMember,
    templates?: (ForumTagTemplate | string)[],
  ): Promise<OperationStatus> {
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

        if (!forum.isThreadOnly()) {
          return { success: false, message: `${forum} is not a forum` };
        }

        try {
          const remaining = forum.availableTags.filter((t) => !Object.values(tags).includes(t.id));
          await forum.setAvailableTags(remaining);

          await this.tagRepo.delete({
            templateId: In(
              templates.map((template) => (typeof template === 'string' ? template : template?.id)),
            ),
          });
        } catch (err) {
          return {
            success: false,
            message: `Failed to remove forum ${forum} tags ${Object.keys(tags).join(', ')}`,
          };
        }

        return OperationStatus.SUCCESS;
      }),
    );

    return OperationStatus.collect(results);
  }

  async deleteTagTemplates(
    member: GuildMember,
    templates?: (ForumTagTemplate | string)[],
  ): Promise<OperationStatus> {
    if (!member.permissions.has('Administrator')) {
      return { success: false, message: 'Only guild administrators can perform this action' };
    }

    const guild = member.guild;

    if (!templates || !Array.isArray(templates)) {
      templates = await this.templateRepo.find({
        where: { guild: guild.id },
      });
    }

    await this.templateRepo.delete(
      templates.map((template) => (typeof template === 'string' ? template : template?.id)),
    );

    return OperationStatus.SUCCESS;
  }
}
