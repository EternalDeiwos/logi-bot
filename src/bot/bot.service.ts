import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  InteractionReplyOptions,
} from 'discord.js';
import { ConsumerResponseError, ConsumerResponsePayload, DiscordAPIInteraction } from 'src/types';
import { ApiError } from 'src/errors';
import { ErrorEmbed } from './embed';

type CommandInteraction = ChatInputCommandInteraction | ContextMenuCommandInteraction;

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly rmq: AmqpConnection,
  ) {}

  async replyOrFollowUp(interaction: [CommandInteraction], options: InteractionReplyOptions);
  async replyOrFollowUp(interaction: CommandInteraction, options: InteractionReplyOptions);
  async replyOrFollowUp(
    interaction: CommandInteraction | [CommandInteraction],
    options: InteractionReplyOptions,
  ) {
    if (Array.isArray(interaction)) {
      interaction = interaction.pop();
    }

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp(options);
    } else {
      return interaction.reply({ ephemeral: true, ...options });
    }
  }

  async reportCommandError(interaction: [CommandInteraction], error: ConsumerResponseError);
  async reportCommandError(interaction: CommandInteraction, error: ConsumerResponseError);
  async reportCommandError(
    interaction: CommandInteraction | [CommandInteraction],
    error: ConsumerResponseError,
  ): Promise<void> {
    this.logger.error(`${error.code}: ${error.message}`, error.cause);

    try {
      if (Array.isArray(interaction)) {
        interaction = interaction.pop();
      }

      if (ErrorEmbed.codes.includes(error.code)) {
        const embed = new ErrorEmbed(error.code as any);
        if (error.message) {
          error.code === 'ERROR_GENERIC'
            ? embed.setTitle(error.message)
            : embed.setDescription(error.message);
        }

        await this.replyOrFollowUp(interaction, { embeds: [embed] });
      } else {
        await this.replyOrFollowUp(interaction, {
          embeds: [new ErrorEmbed('INTERNAL_SERVER_ERROR')],
        });
      }
    } catch (err) {
      this.logger.error(err, err.stack);
      throw new ApiError('DISCORD_ERROR', err);
    }
  }

  async request<R = any>(
    interaction: [CommandInteraction],
    exchange: string,
    routingKey: string,
    data: any,
  );
  async request<R = any>(
    interaction: CommandInteraction,
    exchange: string,
    routingKey: string,
    data: any,
  );
  async request<R = any>(
    interaction: CommandInteraction | [CommandInteraction],
    exchange: string,
    routingKey: string,
    data: any,
  ): Promise<ConsumerResponsePayload<R>> {
    if (Array.isArray(interaction)) {
      interaction = interaction.pop();
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const payload = {
      interaction: interaction.toJSON() as DiscordAPIInteraction,
      ...data,
    };

    const expiration = this.configService.getOrThrow<number>('APP_QUEUE_RPC_EXPIRE');

    return this.rmq.request<ConsumerResponsePayload<R>>({
      exchange,
      routingKey,
      correlationId: interaction.id,
      expiration,
      payload,
    });
  }
}
