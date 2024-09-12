import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder, GuildManager, Snowflake, roleMention } from 'discord.js';
import { InsertResult } from 'typeorm';
import { AuthError, InternalError } from 'src/errors';
import { CrewMemberAccess } from 'src/types';
import { CrewRepository } from 'src/core/crew/crew.repository';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewMemberService } from 'src/core/crew/member/crew-member.service';
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
    const crew = await this.crewRepo.findOneOrFail({ where: { crewSf: channelRef } });
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    const channel = await discordGuild.channels.fetch(crew.crewSf);

    if (!channel || !channel.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const member = await this.memberService.resolveGuildMember(memberRef, channelRef);

    const createdAt = new Date();
    const embed = new EmbedBuilder()
      .setTitle('Crew Update')
      .setColor('DarkGreen')
      .setThumbnail(member.avatarURL() ?? member.user.avatarURL())
      .setDescription(data.content)
      .setTimestamp(createdAt);

    const message = await channel.send({
      content: roleMention(crew.roleSf),
      embeds: [embed],
      allowedMentions: { roles: [crew.roleSf] },
    });

    if (crew.guild?.config?.globalLogChannel) {
      const logChannel = await discordGuild.channels.fetch(crew.guild.config.globalLogChannel);

      if (!logChannel || !logChannel.isTextBased()) {
        throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
      }

      await logChannel.send({
        embeds: [embed.setTitle(crew.name)],
      });
    }

    await message.pin();

    return await this.logRepo.insert({
      guildId: crew.guildId,
      messageSf: message.id,
      crewSf: crew.crewSf,
      content: data.content,
      createdAt,
      createdBy: memberRef,
    });
  }
}
