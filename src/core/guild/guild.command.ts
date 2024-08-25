import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Context, Options, SlashCommandContext, StringOption, Subcommand } from 'necord';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { EchoCommand } from 'src/core/core.command-group';
import { AuthError, ValidationError } from 'src/errors';
import { Embeds } from 'src/utils';
import { GuildService } from './guild.service';
import { DiscordAPIInteraction } from 'src/types';

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
        guildId: interaction.guild.id,
        name,
        shortName,
        icon: interaction.guild.iconURL({ extension: 'png', forceStatic: true }),
      },
    };

    // Access control should happen closer to the logic (i.e. in GuildService etc.)
    // Errors need to be passed back to RPC caller for proper error reporting
    if (!(await this.guildService.isGuildAdmin(payload.interaction))) {
      throw new AuthError('FORBIDDEN', payload.interaction);
    }

    const expiration = this.configService.getOrThrow<number>('APP_QUEUE_RPC_EXPIRE');

    // Need to handle errors from the RPC
    const result = await this.rmq.request<number>({
      exchange: 'discord',
      routingKey: 'discord.rpc.guild.register',
      correlationId: interaction.id,
      expiration,
      payload,
    });

    if (result) {
      return interaction.followUp({
        embeds: [Embeds.Success('Guild registered')],
      });
    } else {
      return interaction.followUp({
        embeds: [Embeds.Success('Guild already registered')],
      });
    }
  }

  // @Subcommand({
  //   name: 'deregister',
  //   description: 'Deregister this guild',
  //   dmPermission: false,
  // })
  // async onDeregisterGuild(@Context() [interaction]: SlashCommandContext) {
  //   await interaction.deferReply({ ephemeral: true });

  //   payload = {
  //     interaction: interaction.toJSON(),
  //     guild: {
  //       guildId: interaction.guild.id,
  //     },
  //   };

  //   if (!(await this.guildService.isGuildAdmin(payload.interaction))) {
  //     throw new AuthError('FORBIDDEN', payload.interaction);
  //   }

  //   expiration = this.configService.getOrThrow<number>('APP_QUEUE_RPC_EXPIRE');
  //   const result = await this.rmq.request<number>({
  //     exchange: 'discord',
  //     routingKey: 'discord.rpc.guild.deregister',
  //     correlationId: interaction.id,
  //     expiration,
  //     payload,
  //   });

  //   if (result) {
  //     return interaction.followUp({
  //       embeds: [Embeds.Success('Guild deregistered')],
  //     });
  //   } else {
  //     return interaction.followUp({
  //       embeds: [Embeds.Success('Guild not registered')],
  //     });
  //   }
  // }
}
