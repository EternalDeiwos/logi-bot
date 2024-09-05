import { Injectable, Logger } from '@nestjs/common';
import { Snowflake } from 'discord.js';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/util';
import { CrewRepository } from 'src/core/crew/crew.repository';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewMemberRepository } from 'src/core/crew/member/crew-member.repository';
import { CrewMemberAccess } from 'src/core/crew/member/crew-member.entity';
import { CrewShareRepository } from './crew-share.repository';
import { AdminOverrideOptions, SkipAccessControlOptions } from 'src/types';

@Injectable()
export class CrewShareService {
  private readonly logger = new Logger(CrewShareService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly crewRepo: CrewRepository,
    private readonly crewService: CrewService,
    private readonly memberRepo: CrewMemberRepository,
    private readonly shareRepo: CrewShareRepository,
  ) {}

  async shareCrew(
    guildRef: Snowflake,
    channelRef: Snowflake,
    memberRef: Snowflake,
    options: Partial<AdminOverrideOptions & SkipAccessControlOptions> = {},
  ) {
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

    if (
      !options.isAdmin &&
      !options.skipAccessControl &&
      (!crewMember || !crewMember.requireAccess(CrewMemberAccess.ADMIN))
    ) {
      return { success: false, message: 'Not an administrator of this crew' };
    }

    try {
      await this.shareRepo.insert({
        target: guildRef,
        channel: channel.id,
        createdBy: crewMember.member,
      });
    } catch (err) {
      this.logger.warn(`Failed to share ${crew.name} with guild ${guildRef}: ${err.message}`);
      return { success: false, message: 'Unable to share this crew' };
    }

    return OperationStatus.SUCCESS;
  }
}
