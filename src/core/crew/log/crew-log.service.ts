import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder, Snowflake, roleMention } from 'discord.js';
import { DeepPartial } from 'typeorm';
import { OperationStatus } from 'src/util';
import { CrewRepository } from 'src/core/crew/crew.repository';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewMemberRepository } from 'src/core/crew/member/crew-member.repository';
import { CrewMemberService } from 'src/core/crew/member/crew-member.service';
import { CrewMemberAccess } from 'src/core/crew/member/crew-member.entity';
import { CrewLogRepository } from './crew-log.repository';
import { CrewLog } from './crew-log.entity';
import { AuthError } from 'src/errors';

@Injectable()
export class CrewLogService {
  private readonly logger = new Logger(CrewLogService.name);

  constructor(
    private readonly crewRepo: CrewRepository,
    private readonly crewService: CrewService,
    private readonly memberService: CrewMemberService,
    private readonly logRepo: CrewLogRepository,
  ) {}

  async addCrewLog(
    channelRef: Snowflake,
    memberRef: Snowflake,
    data: DeepPartial<Pick<CrewLog, 'content'>>,
  ): Promise<OperationStatus> {
    const crew = await this.crewRepo.findOne({ where: { channel: channelRef } });

    if (!crew) {
      return { success: false, message: 'Invalid channel' };
    }

    const channel = await this.crewService.resolveCrewTextChannel(crew);
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

    await this.logRepo.insert({
      guild: crew.guild,
      message: message.id,
      discussion: crew.channel,
      content: data.content,
      createdAt,
      createdBy: memberRef,
    });

    return OperationStatus.SUCCESS;
  }
}
