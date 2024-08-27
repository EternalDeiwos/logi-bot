import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Context, Options, SlashCommandContext, StringOption, Subcommand } from 'necord';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { EchoCommand } from 'src/core/core.command-group';
import { SuccessEmbed } from 'src/bot/embed';
import { BotService } from 'src/bot/bot.service';
import { ValidationError } from 'src/errors';
import { ConsumerResponsePayload, DiscordAPIInteraction } from 'src/types';
import { GuildService } from './guild.service';

export class EditGuildCommandParams {
  @StringOption({
    name: 'name',
    description: 'Display name for this guild',
    required: false,
  })
  name: string;

  @StringOption({
    name: 'name_short',
    description: 'A short name or acronym for tighter spaces',
    required: false,
  })
  shortName: string;
}

export class SelectGuildCommandParams {
  @StringOption({
    name: 'guild',
    description: 'Select a guild',
    autocomplete: true,
    required: true,
  })
  guild: string;
}

@Injectable()
@EchoCommand({
  name: 'guild',
  description: 'Manage guilds',
})
@UseFilters(DiscordExceptionFilter)
export class GuildCommand {
  private readonly logger = new Logger(GuildCommand.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly botService: BotService,
    private readonly guildService: GuildService,
    private readonly rmq: AmqpConnection,
  ) {}

  @Subcommand({
    name: 'register',
    description: 'Register this guild',
    dmPermission: false,
  })
  async onRegisterGuild(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: EditGuildCommandParams,
  ) {
    await interaction.deferReply({ ephemeral: true });
    const name = data.name ?? interaction.guild.name;
    const shortName = data.shortName ?? interaction.guild.nameAcronym;

    if (!name || !shortName) {
      throw new ValidationError('MALFORMED_INPUT', { name, shortName });
    }

    const payload = {
      interaction: interaction.toJSON() as DiscordAPIInteraction,
      guild: {
        guildSf: interaction.guild.id,
        name,
        shortName,
        icon: interaction.guild.iconURL({ extension: 'png', forceStatic: true }),
      },
    };

    const expiration = this.configService.getOrThrow<number>('APP_QUEUE_RPC_EXPIRE');

    const { error: handlingError, content } = await this.rmq.request<
      ConsumerResponsePayload<number>
    >({
      exchange: 'discord',
      routingKey: 'discord.rpc.guild.register',
      correlationId: interaction.id,
      expiration,
      payload,
    });

    if (handlingError) {
      return this.botService.reportCommandError(interaction, handlingError);
    }

    if (content) {
      return interaction.followUp({
        embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Guild registered')],
      });
    } else {
      return interaction.followUp({
        embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Guild already registered')],
      });
    }
  }
}
