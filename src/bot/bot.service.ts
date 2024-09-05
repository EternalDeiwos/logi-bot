import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  InteractionReplyOptions,
  ModalSubmitInteraction,
} from 'discord.js';
import { ConsumerResponsePayload, DiscordAPIInteraction } from 'src/types';
import { ConsumerResponseError, BaseError } from 'src/errors';
import { ErrorEmbed } from './embed';

export type CommandInteraction =
  | ChatInputCommandInteraction
  | ContextMenuCommandInteraction
  | ModalSubmitInteraction
  | ButtonInteraction;

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

      const embed = ErrorEmbed.codes.includes(error.code)
        ? new ErrorEmbed(error.code as any)
        : new ErrorEmbed('INTERNAL_SERVER_ERROR');

      if (!error.internal && error.message) {
        error.code === 'ERROR_GENERIC'
          ? embed.setTitle(error.message)
          : embed.setDescription(error.message);
      }

      await this.replyOrFollowUp(interaction, { embeds: [embed] });
    } catch (err) {
      this.logger.error(err, err.stack);
      throw new BaseError('EXTERNAL_ERROR', 'Discord interaction failed', err);
    }
  }

  async request<T = any, R = any>(
    interaction: [CommandInteraction],
    exchange: string,
    routingKey: string,
    data?: T,
  ): Promise<R>;
  async request<T = any, R = any>(
    interaction: CommandInteraction,
    exchange: string,
    routingKey: string,
    data?: T,
  ): Promise<R>;
  async request<T = any, R = any>(
    interaction: CommandInteraction | [CommandInteraction],
    exchange: string,
    routingKey: string,
    data?: T,
  ): Promise<R> {
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

    const { content, error } = await this.rmq.request<ConsumerResponsePayload<R>>({
      exchange,
      routingKey,
      correlationId: interaction.id,
      expiration,
      payload,
    });

    if (error) {
      throw BaseError.from(error);
    }

    return content;
  }

  async publish<T = any>(
    interaction: [CommandInteraction],
    exchange: string,
    routingKey: string,
    data?: T,
  ): Promise<void>;
  async publish<T = any>(
    interaction: CommandInteraction,
    exchange: string,
    routingKey: string,
    data?: T,
  ): Promise<void>;
  async publish<T = any>(
    interaction: CommandInteraction | [CommandInteraction],
    exchange: string,
    routingKey: string,
    data?: T,
  ): Promise<void> {
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

    const result = await this.rmq.publish(exchange, routingKey, payload, {
      correlationId: interaction.id,
      expiration,
    });

    if (!result) {
      throw new BaseError('INTERNAL_SERVER_ERROR', 'Failed to publish message to queue', {
        exchange,
        routingKey,
      });
    }
  }
}
