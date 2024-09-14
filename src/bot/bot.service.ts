import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AutocompleteInteraction, Interaction, InteractionReplyOptions } from 'discord.js';
import { ArrayOrElement, ConsumerResponsePayload, DiscordAPIInteraction } from 'src/types';
import { ConsumerResponseError, BaseError } from 'src/errors';
import { ErrorEmbed } from './embed';

export type CommandInteraction = Exclude<Interaction, AutocompleteInteraction>;

export abstract class BotService {
  abstract replyOrFollowUp(
    interaction: ArrayOrElement<CommandInteraction>,
    options: InteractionReplyOptions,
  ): Promise<any>;

  abstract reportCommandError(
    interaction: ArrayOrElement<Interaction>,
    error: ConsumerResponseError,
  ): Promise<void>;

  abstract request<T = any, R = any>(
    interaction: ArrayOrElement<Interaction>,
    exchange: string,
    routingKey: string,
    data?: T,
  ): Promise<R>;

  abstract publish<T = any>(
    interaction: ArrayOrElement<Interaction>,
    exchange: string,
    routingKey: string,
    data?: T,
  ): Promise<void>;
}

@Injectable()
export class BotServiceImpl extends BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly rmq: AmqpConnection,
  ) {
    super();
  }

  async replyOrFollowUp(
    interaction: ArrayOrElement<CommandInteraction>,
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

  async reportCommandError(
    interaction: ArrayOrElement<Interaction>,
    error: ConsumerResponseError,
  ): Promise<void> {
    try {
      if (Array.isArray(interaction)) {
        interaction = interaction.pop();
      }

      if (interaction instanceof AutocompleteInteraction) {
        return;
      }

      const embed = ErrorEmbed.codes.includes(error.code)
        ? new ErrorEmbed(error.code as any)
        : new ErrorEmbed('INTERNAL_SERVER_ERROR');

      if (!error.internal && error.message) {
        error.code === 'ERROR_GENERIC'
          ? embed.setTitle(error.message)
          : embed.setDescription(error.message);
      }

      if (error.cause?.code) {
        embed.setFooter({ text: `CODE: ${(error.cause as any).code}` });
      }

      await this.replyOrFollowUp(interaction, { embeds: [embed] });
    } catch (err) {
      this.logger.error(err, err.stack);
      throw new BaseError('EXTERNAL_ERROR', 'Discord interaction failed', err);
    }
  }

  async request<T = any, R = any>(
    interaction: ArrayOrElement<Interaction>,
    exchange: string,
    routingKey: string,
    data?: T,
  ): Promise<R> {
    if (Array.isArray(interaction)) {
      interaction = interaction.pop();
    }

    if (
      !(interaction instanceof AutocompleteInteraction) &&
      !interaction.deferred &&
      !interaction.replied
    ) {
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
    interaction: ArrayOrElement<Interaction>,
    exchange: string,
    routingKey: string,
    data?: T,
  ): Promise<void> {
    if (Array.isArray(interaction)) {
      interaction = interaction.pop();
    }

    if (
      !(interaction instanceof AutocompleteInteraction) &&
      !interaction.deferred &&
      !interaction.replied
    ) {
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
