import { Injectable, Logger } from '@nestjs/common';
import { Nack, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { ErrorBase } from 'src/errors';
import { GuildService } from './guild.service';
import { InsertGuild } from './guild.entity';

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
  public async registerGuildHandler(guild: InsertGuild) {
    try {
      const result = await this.guildService.registerGuild(guild);
      return result?.identifiers?.length;
    } catch (err) {
      this.logger.error(err, err instanceof ErrorBase ? err.cause?.stack ?? err.stack : err.stack);
      return new Nack();
    }
  }
}
