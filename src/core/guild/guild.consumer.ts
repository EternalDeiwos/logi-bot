import { Injectable, Logger } from '@nestjs/common';
import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { DiscordCommandHandlerPayload } from 'src/types';
import { AuthError, InternalError, ValidationError } from 'src/errors';
import { GuildService } from './guild.service';
import { InsertGuild, SelectGuild } from './guild.entity';

type RegisterGuildHandlerPayload = { guild: InsertGuild } & DiscordCommandHandlerPayload;
type DeregisterGuildHandlerPayload = { guild: SelectGuild } & DiscordCommandHandlerPayload;

@Injectable()
export class GuildConsumer {
  private readonly logger = new Logger(GuildConsumer.name);

  constructor(private readonly guildService: GuildService) {}

  @RabbitRPC({
    exchange: 'discord',
    routingKey: 'discord.rpc.guild.register',
    queue: 'discord-guild-register',
    queueOptions: {
      deadLetterExchange: 'retry',
      durable: true,
    },
  })
  public async registerGuildHandler(payload: RegisterGuildHandlerPayload) {
    const { guild } = payload;
    const result = await this.guildService.registerGuild(guild);
    return result?.identifiers?.length;
  }

  @RabbitRPC({
    exchange: 'discord',
    routingKey: 'discord.rpc.guild.deregister',
    queue: 'discord-guild-deregister',
    queueOptions: {
      deadLetterExchange: 'retry',
      durable: true,
    },
  })
  public async deregisterGuildHandler(payload: DeregisterGuildHandlerPayload) {
    const { guild } = payload;
    if (!guild.id && !guild.guildId) {
      throw new ValidationError('MALFORMED_INPUT', payload);
    }

    const result = await this.guildService.deleteGuild(guild);
    return result?.affected;
  }
}
