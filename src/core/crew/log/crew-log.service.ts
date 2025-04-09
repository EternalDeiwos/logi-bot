import { Injectable, Logger } from '@nestjs/common';
import { GuildBasedChannel, GuildManager, Snowflake } from 'discord.js';
import { InsertResult } from 'typeorm';
import { InternalError } from 'src/errors';
import { CrewService } from 'src/core/crew/crew.service';
import { SelectCrewDto } from 'src/core/crew/crew.entity';
import { WarService } from 'src/game/war/war.service';
import { CrewLogRepository } from './crew-log.repository';
import { InsertCrewLogDto } from './crew-log.entity';
import { CrewLogPromptBuilder } from './crew-log.prompt';
import { GuildSettingName } from 'src/core/guild/guild-setting.entity';

export abstract class CrewLogService {
  /**
   * Abstract method for adding a crew log.
   *
   * @param crewRef - The reference to the crew's channel.
   * @param memberRef - The reference to the member adding the log.
   * @param data - Partial data containing the content of the log.
   */
  abstract addCrewLog(
    crewRef: SelectCrewDto,
    memberRef: Snowflake,
    data: InsertCrewLogDto,
  ): Promise<InsertResult>;
}

@Injectable()
export class CrewLogServiceImpl extends CrewLogService {
  private readonly logger = new Logger(CrewLogService.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly crewService: CrewService,
    private readonly warService: WarService,
    private readonly logRepo: CrewLogRepository,
  ) {
    super();
  }

  async addCrewLog(crewRef: SelectCrewDto, memberRef: Snowflake, data: InsertCrewLogDto) {
    const crew = await this.crewService.query().byCrew(crewRef).withGuildSettings().getOneOrFail();
    const discordGuild = await this.guildManager.fetch(crew.guild.guildSf);
    const channel = await discordGuild.channels.fetch(crew.crewSf);
    const war = await this.warService.query().byCurrent().getOneOrFail();
    const { [GuildSettingName.GUILD_LOG_CHANNEL]: globalLogChannelSf } = crew.guild.getConfig();

    if (!channel || !channel.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const member = await discordGuild.members.fetch(memberRef);
    const createdAt = new Date();

    const prompt = new CrewLogPromptBuilder()
      .addCrewLogMessage(discordGuild, crew, member, data.content, createdAt, war.warNumber)
      .addCrewJoinButton(crew);

    const message = await channel.send(
      prompt.clone<CrewLogPromptBuilder>().addCrewMention(crew).build(),
    );

    if (globalLogChannelSf) {
      let logChannel: GuildBasedChannel;
      try {
        logChannel = await discordGuild.channels.fetch(globalLogChannelSf);
        if (logChannel && logChannel.isTextBased()) {
          await logChannel.send(prompt.addCrewChannelLink(crew).build());
        }
      } catch (err) {
        this.logger.warn(`Configured global log channel for ${crew.guild.name} is missing`, err);
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
