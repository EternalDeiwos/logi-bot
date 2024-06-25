import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder, Snowflake, roleMention } from 'discord.js';
import { DeepPartial } from 'typeorm';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/util';
import { CrewRepository } from 'src/bot/crew/crew.repository';
import { CrewService } from 'src/bot/crew/crew.service';
import { CrewMemberRepository } from 'src/bot/crew/member/crew-member.repository';
import { CrewMemberService } from 'src/bot/crew/member/crew-member.service';
import { CrewMemberAccess } from 'src/bot/crew/member/crew-member.entity';
import { CrewLogRepository } from './crew-log.repository';
import { CrewLog } from './crew-log.entity';

@Injectable()
export class CrewLogService {
  private readonly logger = new Logger(CrewLogService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly crewRepo: CrewRepository,
    private readonly crewService: CrewService,
    private readonly memberRepo: CrewMemberRepository,
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

    const { data: channel, ...channelResult } = await this.crewService.resolveCrewChannel(crew);

    if (!channelResult.success) {
      return channelResult;
    }

    const crewMember = await this.memberRepo.findOne({
      where: { channel: channelRef, member: memberRef },
    });

    const { data: member, ...memberResult } =
      await this.memberService.resolveGuildMember(crewMember);

    if (!memberResult.success) {
      return memberResult;
    }

    const { data: isAdmin, ...adminResult } = await this.memberService.isAdmin(member);

    if (!adminResult.success) {
      return adminResult;
    }

    if (!isAdmin && (!crewMember || !crewMember.requireAccess(CrewMemberAccess.MEMBER))) {
      return { success: false, message: 'Not a member of this crew' };
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
      createdBy: crewMember.member,
    });

    return OperationStatus.SUCCESS;
  }
}
