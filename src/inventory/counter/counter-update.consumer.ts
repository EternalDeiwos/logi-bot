import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { GuildManager, Snowflake } from 'discord.js';
import { ConsumeMessage } from 'amqplib';
import { DiscordAPIInteraction } from 'src/types';
import { CounterService } from './counter.service';
import { InsertCounterEntryDto } from './counter-entry.entity';
import { GuildService } from 'src/core/guild/guild.service';
import { CurrentCounter } from './counter.entity';
import { CounterStaticUpdatePromptBuilder } from './ui/counter-static.prompt';
import { GuildSettingName } from 'src/core/guild/guild-setting.entity';
import { BotService } from 'src/bot/bot.service';
import { DiscordActionType } from 'src/bot/discord-actions.consumer';

export type CounterUpdate = { counter: CurrentCounter; channel: Snowflake };

@Injectable()
export class CounterUpdateConsumer {
  private readonly logger = new Logger(CounterUpdateConsumer.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly botService: BotService,
    private readonly guildService: GuildService,
    private readonly counterService: CounterService,
  ) {}

  @RabbitSubscribe({
    exchange: 'counter',
    routingKey: 'counter.update',
    queue: 'counter-update-notify',
    queueOptions: {
      deadLetterExchange: 'errors',
    },
  })
  public async processCounterUpdate(
    payload: { updates: InsertCounterEntryDto[]; interaction: DiscordAPIInteraction },
    msg: ConsumeMessage,
  ) {
    const { interaction, updates } = payload;
    const guild = await this.guildService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .getOneOrFail();
    const guildConfig = guild.getConfig();
    const discordGuild = await this.guildManager.fetch(interaction.guildId);
    const counters = await this.counterService
      .query()
      .withCatalog()
      .withCrew()
      .byCounter(updates.map((c) => ({ id: c.counterId })))
      .getMany();

    if (!counters.length) {
      return;
    }

    // This will break if used cross-guild
    const member = await discordGuild.members.fetch(interaction.user);
    const prompt = new CounterStaticUpdatePromptBuilder().addUpdateControls(counters[0].crewId);

    const channels = new Set<Snowflake>(
      guildConfig[GuildSettingName.COUNTER_LOG_CHANNEL]
        ? [guildConfig[GuildSettingName.COUNTER_LOG_CHANNEL]]
        : [],
    );
    for (const counter of counters) {
      counter.guild = guild;
      prompt.addCounter(counter, {
        footer: {
          text: `WC${counter.warNumber} • Submitted by ${member.displayName}`,
          iconURL: member.displayAvatarURL(),
        },
      });

      channels.add(counter.crew?.crewSf);
    }

    const message = prompt.build();

    for (const channelRef of channels) {
      await this.botService.publishDiscordAction({
        type: DiscordActionType.SEND_MESSAGE,
        guildSf: guild.guildSf,
        channelSf: channelRef,
        message,
      });
    }
  }
}
