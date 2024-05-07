import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuildChannel, GuildMember, Role, User, channelLink, userMention } from 'discord.js';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/types';
import { Team } from './team.entity';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
  ) {}

  async registerTeam(
    forum: GuildChannel,
    role: GuildMember | Role | User,
    member: GuildMember,
  ): Promise<OperationStatus<string>> {
    if (!member.permissions.has('Administrator')) {
      return { success: false, message: 'Only guild administrators can perform this action' };
    }

    if (!forum.isThreadOnly()) {
      return { success: false, message: `${channelLink(forum.id)} is not a valid forum` };
    }

    if ('roles' in role || 'username' in role) {
      return { success: false, message: `${userMention(role.id)} is not a valid role` };
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
}
