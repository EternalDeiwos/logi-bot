import { Injectable, Logger } from '@nestjs/common';
import { GuildBasedChannel, GuildManager, Snowflake } from 'discord.js';
import { InsertResult } from 'typeorm';
import { InternalError } from 'src/errors';
import { CrewService } from 'src/core/crew/crew.service';
import { CrewMemberService } from 'src/core/crew/member/crew-member.service';
import { CrewLogRepository } from './crew-log.repository';
import { InsertCrewLog } from './crew-log.entity';
import { CrewLogPromptBuilder } from './crew-log.prompt';

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
    private readonly crewService: CrewService,
    private readonly memberService: CrewMemberService,
    private readonly logRepo: CrewLogRepository,
  ) {
    super();
  }

  async addCrewLog(channelRef: Snowflake, memberRef: Snowflake, data: InsertCrewLog) {
    const crew = await this.crewService.query().byCrew({ crewSf: channelRef }).getOneOrFail();
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    const channel = await discordGuild.channels.fetch(crew.crewSf);

    if (!channel || !channel.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const member = await this.memberService.resolveGuildMember(memberRef, channelRef);
    const createdAt = new Date();

    const prompt = new CrewLogPromptBuilder()
      .addCrewLogMessage(discordGuild, crew, member, data.content, createdAt)
      .addCrewJoinButton(crew);

    const message = await channel.send(
      prompt.clone<CrewLogPromptBuilder>().addCrewMention(crew).build(),
    );

    if (crew.guild?.config?.globalLogChannel) {
      let logChannel: GuildBasedChannel;
      try {
        logChannel = await discordGuild.channels.fetch(crew.guild.config.globalLogChannel);
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send(prompt.build());
        }
      } catch (err) {
        this.logger.warn(`Configured global log channel for ${crew.guild.name} is missing`);
      }
    }

    await message.pin();

    return await this.logRepo.insert({
      guildId: crew.guildId,
      messageSf: message.id,
      crewId: crew.id,
      content: data.content,
      createdAt,
      createdBy: memberRef,
    });
  }
}
