import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { flatten } from 'lodash';
import { AutocompleteInteraction, Interaction, InteractionReplyOptions } from 'discord.js';
import { ArrayOrElement, ConsumerResponsePayload, DiscordAPIInteraction } from 'src/types';
import { ConsumerResponseError, BaseError } from 'src/errors';
import { ErrorEmbed } from './embed';

export type CommandInteraction = Exclude<Interaction, AutocompleteInteraction>;
export type Reply =
  | Awaited<ReturnType<CommandInteraction['reply']>>
  | Awaited<ReturnType<CommandInteraction['followUp']>>;

export abstract class BotService {
  abstract replyOrFollowUp(
    interaction: ArrayOrElement<CommandInteraction>,
    options: InteractionReplyOptions,
  ): Promise<Reply[]>;

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
  ): Promise<Reply[]> {
    if (Array.isArray(interaction)) {
      interaction = interaction.pop();
    }

    if (options.embeds && options.embeds.length > 10) {
      const { embeds, ...rest } = options;
      const result = [];
      for (let count = 0; count < embeds.length; count += 10) {
        result.push(
          await this.replyOrFollowUp(interaction, {
            ...rest,
            embeds: embeds.slice(count, count + 10),
          }),
        );
      }

      return flatten(result);
    }

    if (interaction.replied || interaction.deferred) {
      return [await interaction.followUp({ ephemeral: true, ...options })];
    } else {
      return [await interaction.reply({ ephemeral: true, ...options })];
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
