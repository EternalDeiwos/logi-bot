import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { Nack, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { ValidationError, ErrorBase, RMQExceptionHandler } from 'src/errors';
import { GuildService } from './guild.service';
import { InsertGuild, SelectGuild } from './guild.entity';

@Injectable()
export class GuildConsumer {
  private readonly logger = new Logger(GuildConsumer.name);

  constructor(private readonly guildService: GuildService) {}

  @RabbitRPC({
    exchange: 'discord',
    routingKey: 'discord.rpc.guild.register',
    queue: 'discord-guild-register',
    queueOptions: {
      deadLetterExchange: 'errors',
    },
  })
  @UseFilters(new RMQExceptionHandler())
  public async registerGuildHandler(payload: InsertGuild) {
    const result = await this.guildService.registerGuild(payload);
    return result?.identifiers?.length;
  }

  @RabbitRPC({
    exchange: 'discord',
    routingKey: 'discord.rpc.guild.deregister',
    queue: 'discord-guild-deregister',
    queueOptions: {
      deadLetterExchange: 'errors',
    },
  })
  public async deregisterGuildHandler(payload: SelectGuild) {
    if (!payload.id && !payload.guildId) {
      throw new ValidationError('MALFORMED_INPUT', payload);
    }

    const result = await this.guildService.deleteGuild(payload);
    return result?.affected;
  }
}
