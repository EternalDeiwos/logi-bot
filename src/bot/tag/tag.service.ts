import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guild, GuildMember, GuildForumTag } from 'discord.js';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/types';
import { Crew } from 'src/bot/crew/crew.entity';
import { Team } from 'src/bot/team/team.entity';
import { ForumTag } from './tag.entity';
import { ForumTagTemplate } from './tag-template.entity';

export enum TicketTag {
  TRIAGE = 'Triage',
  ACCEPTED = 'Accepted',
  DECLINED = 'Declined',
  REPEATABLE = 'Repeatable',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
  ABANDONED = 'Abandoned',
}

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ForumTag) private readonly tagRepo: Repository<ForumTag>,
    @InjectRepository(ForumTagTemplate) private readonly templateRepo: Repository<ForumTagTemplate>,
  ) {}

  async getTemplates(guild: Guild) {
    return this.templateRepo.find({ where: { guild: guild.id } });
  }

  async existsTemplate(guild: Guild, name: string) {
    return this.templateRepo.exists({ where: { guild: guild.id, name } });
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
    const tags = [triage, accepted, declined].concat(unmoderated);

    try {
      await this.templateRepo.insert(tags);
    } catch {
      return { success: false, message: 'The basic tags already exist' };
    }

    return { success: true, message: 'Done' };
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

    return { success: true, message: 'Done' };
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

    return { success: true, message: 'Done' };
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

    return { success: true, message: 'Done' };
  }
}
