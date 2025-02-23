import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import { InternalError } from 'src/errors';
import {
  DiscordActionResponse,
  DiscordActionTarget,
  DiscordActionType,
} from 'src/bot/discord-actions.consumer';
import { CrewService } from './crew.service';

@Injectable()
export class CrewDiscordActionsResponseConsumer {
  private readonly logger = new Logger(CrewDiscordActionsResponseConsumer.name);

  constructor(private readonly crewService: CrewService) {}

  @RabbitSubscribe({
    exchange: 'discord',
    routingKey: 'response.crew.#',
    queue: 'discord-crew-response-processing',
    queueOptions: {
      deadLetterExchange: 'retry',
    },
  })
  public async processCrewRole(
    payload: DiscordActionResponse<DiscordActionType, DiscordActionTarget.CREW>,
    msg: ConsumeMessage,
  ) {
    const { type, target } = payload;

    if (target.type !== DiscordActionTarget.CREW) {
      throw new InternalError(
        'INTERNAL_SERVER_ERROR',
        'Message type is inconsistent with RMQ routing',
      );
    }

    switch (type) {
      case DiscordActionType.ENSURE_ROLE:
        return this.ensureCrewRole(payload);

      case DiscordActionType.ENSURE_CHANNEL:
        if (target.field === 'crewSf') {
          return this.ensureCrewTextChannel(payload);
        } else if (target.field === 'voiceSf') {
          return this.ensureCrewVoiceChannel(payload);
        } else {
          this.logger.debug(
            `An unknown channel was created for crew ${target.crewId} with field ${target.field}`,
          );
          return;
        }

      case DiscordActionType.SEND_MESSAGE:
        if (target.field === 'auditMessageSf') {
          return this.ensureAuditMessage(payload);
        } else {
          this.logger.debug(
            `An unknown message was sent for crew ${target.crewId} with field ${target.field}`,
          );
          return;
        }

      default:
        // NOOP
        this.logger.warn(`No action for ${msg.fields.exchange}:${msg.fields.routingKey}`);
    }
  }

  private async ensureCrewRole(
    payload: DiscordActionResponse<DiscordActionType.ENSURE_ROLE, DiscordActionTarget.CREW>,
  ) {
    const { crewId: id } = payload.target;
    this.logger.debug(
      `Registering role ${payload.roleSf} for target ${JSON.stringify(payload.target)}`,
    );
    await this.crewService.updateCrew({ id }, { roleSf: payload.roleSf });
    await this.crewService.reconcileCrew({ id });
  }

  private async ensureCrewTextChannel(
    payload: DiscordActionResponse<DiscordActionType.ENSURE_CHANNEL, DiscordActionTarget.CREW>,
  ) {
    const { crewId: id } = payload.target;
    this.logger.debug(
      `Registering crew channel ${payload.channelSf} for target ${JSON.stringify(payload.target)}`,
    );
    await this.crewService.updateCrew({ id }, { crewSf: payload.channelSf });
    await this.crewService.reconcileCrew({ id });
  }

  private async ensureCrewVoiceChannel(
    payload: DiscordActionResponse<DiscordActionType.ENSURE_CHANNEL, DiscordActionTarget.CREW>,
  ) {
    const { crewId: id } = payload.target;
    this.logger.debug(
      `Registering crew voice channel ${payload.channelSf} for target ${JSON.stringify(payload.target)}`,
    );
    await this.crewService.updateCrew({ id }, { voiceSf: payload.channelSf });
  }

  private async ensureAuditMessage(
    payload: DiscordActionResponse<DiscordActionType.SEND_MESSAGE, DiscordActionTarget.CREW>,
  ) {
    const { crewId: id } = payload.target;
    const auditMessageSf = payload.messageSf.length && payload.messageSf[0];
    this.logger.debug(
      `Registering audit message ${auditMessageSf} for target ${JSON.stringify(payload.target)}`,
    );
    await this.crewService.updateCrew({ id }, { auditMessageSf });
  }
}
