import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder, GuildManager, Snowflake, roleMention } from 'discord.js';
import { InsertResult } from 'typeorm';
import { AuthError, InternalError } from 'src/errors';
import { CrewRepository } from 'src/core/crew/crew.repository';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewMemberService } from 'src/core/crew/member/crew-member.service';
import { CrewMemberAccess } from 'src/core/crew/member/crew-member.entity';
import { CrewLogRepository } from './crew-log.repository';
import { InsertCrewLog } from './crew-log.entity';

export abstract class CrewLogService {
  /**
   * Abstract method for adding a crew log.
   *
   * @param channelRef - The reference to the crew's channel.
   * @param memberRef - The reference to the member adding the log.
   * @param data - Partial data containing the content of the log.
   */
  abstract addCrewLog(
    channelRef: Snowflake,
    memberRef: Snowflake,
    data: InsertCrewLog,
  ): Promise<InsertResult>;
}

@Injectable()
export class CrewLogServiceImpl extends CrewLogService {
  private readonly logger = new Logger(CrewLogService.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly crewRepo: CrewRepository,
    private readonly crewService: CrewService,
    private readonly memberService: CrewMemberService,
    private readonly logRepo: CrewLogRepository,
  ) {
    super();
  }

  async addCrewLog(channelRef: Snowflake, memberRef: Snowflake, data: InsertCrewLog) {
    const crew = await this.crewRepo.findOneOrFail({ where: { channel: channelRef } });

    if (!crew) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid crew');
    }

    const discordGuild = await this.guildManager.fetch(crew.guild);
    const channel = await discordGuild.channels.fetch(crew.channel);

    if (!channel || !channel.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const member = await this.memberService.resolveGuildMember(channelRef, memberRef);

    if (!this.memberService.requireCrewAccess(channelRef, memberRef, CrewMemberAccess.MEMBER)) {
      throw new AuthError('FORBIDDEN', 'Not a member of this crew');
    }

    const createdAt = new Date();
    const embed = new EmbedBuilder()
      .setTitle('Crew Update')
      .setColor('DarkGreen')
      .setThumbnail(member.avatarURL() ?? member.user.avatarURL())
      .setDescription(data.content)
      .setTimestamp(createdAt);

    const message = await channel.send({
      content: roleMention(crew.role),
      embeds: [embed],
      allowedMentions: { roles: [crew.role] },
    });

    await message.pin();

    return await this.logRepo.insert({
      guild: crew.guild,
      message: message.id,
      discussion: crew.channel,
      content: data.content,
      createdAt,
      createdBy: memberRef,
    });
  }
}
