import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Context, Options, SlashCommandContext, StringOption, Subcommand } from 'necord';
import { ApiError, DiscordError, ErrorBase, InternalError } from 'src/errors';
import { EchoCommand } from 'src/discord/discord.command-group';

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
export class GuildCommand {
  private readonly logger = new Logger(GuildCommand.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly rmq: AmqpConnection,
  ) {}

  @Subcommand({
    name: 'register',
    description: 'Register this guild',
    dmPermission: false,
  })
  async onCreateCrew(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: EditGuildCommandParams,
  ) {
    try {
      try {
        await interaction.deferReply({ ephemeral: true });
        const name = data.name ?? interaction.guild.name;
        const shortName = data.shortName ?? interaction.guild.nameAcronym;

        if (!name || !shortName) {
          throw new DiscordError('MALFORMED_INPUT', { name, shortName });
        }

        const payload = {
          guildId: interaction.guild.id,
          name,
          shortName,
          icon: interaction.guild.iconURL({ extension: 'png', forceStatic: true }),
        };

        const timeout = this.configService.getOrThrow<number>('APP_RPC_TIMEOUT');
        const result = await this.rmq.request<number>({
          exchange: 'discord',
          routingKey: 'discord.rpc.guild.register',
          correlationId: interaction.id,

          timeout,
          expiration: timeout,
          payload,
        });

        if (result) {
          return interaction.followUp({ content: 'Guild registered' });
        } else {
          return interaction.followUp({ content: 'Guild already registered' });
        }
      } catch (err) {
        if (err instanceof ErrorBase) {
          this.logger.error(err, err.cause?.stack ?? err.stack);
          await interaction.followUp({ content: err.toString() });
        } else {
          this.logger.error(err, err.stack);
          await interaction.followUp({
            content: new InternalError('INTERNAL_SERVER_ERROR').toString(),
          });
        }

        return;
      }
    } catch (err) {
      this.logger.error(new ApiError('DISCORD', 'Interaction failed'), err.stack);
    }
  }
}
