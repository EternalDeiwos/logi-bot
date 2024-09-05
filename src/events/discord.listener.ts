import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, ContextOf, On } from 'necord';
import { BaseError } from 'src/errors';

@Injectable()
export class BotEventListener {
  private readonly logger = new Logger(BotEventListener.name, { timestamp: true });

  constructor(
    private readonly configService: ConfigService,
    private readonly rmq: AmqpConnection,
  ) {}

  @On('ready')
  async onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @On('guildCreate')
  async onGuildCreate(@Context() [guild]: ContextOf<'guildCreate'>) {
    try {
      const payload = {
        guildId: guild.id,
        name: guild.name,
        shortName: guild.nameAcronym,
        icon: guild.iconURL({ extension: 'png', forceStatic: true }),
      };

      const timeout = this.configService.getOrThrow<number>('APP_RPC_TIMEOUT');
      await this.rmq.publish('discord', 'discord.rpc.guild.register', payload, {
        expiration: timeout,
      });
    } catch (err) {
      this.logger.error(
        new BaseError('INTERNAL_SERVER_ERROR', 'Failed to handle guild create event', err),
        err.stack,
      );
    }
  }

  @On('guildDelete')
  async onGuildDelete(@Context() [guild]: ContextOf<'guildDelete'>) {
    try {
      const payload = {
        guildId: guild.id,
      };

      const timeout = this.configService.getOrThrow<number>('APP_RPC_TIMEOUT');
      await this.rmq.publish('discord', 'discord.rpc.guild.deregister', payload, {
        expiration: timeout,
      });
    } catch (err) {
      this.logger.error(
        new BaseError('INTERNAL_SERVER_ERROR', 'Failed to handle guild delete event', err),
        err.stack,
      );
    }
  }

  @On('roleDelete')
  async onRoleDelete(@Context() [role]: ContextOf<'roleDelete'>) {}

  @On('channelDelete')
  async onChannelDelete(@Context() [channel]: ContextOf<'channelDelete'>) {}

  @On('threadCreate')
  async onThreadCreate(@Context() [thread]: ContextOf<'threadCreate'>) {}

  @On('threadUpdate')
  async onThreadUpdate(@Context() [oldThread, newThread]: ContextOf<'threadUpdate'>) {}

  @On('threadDelete')
  async onThreadDelete(@Context() [thread]: ContextOf<'threadDelete'>) {}

  @On('guildMemberAdd')
  async onMemberAdd(@Context() [member]: ContextOf<'guildMemberAdd'>) {}

  @On('guildMemberRemove')
  async onMemberLeave(@Context() [member]: ContextOf<'guildMemberRemove'>) {}

  @On('guildMemberUpdate')
  async onMemberChange(@Context() [old, member]: ContextOf<'guildMemberUpdate'>) {}

  @On('guildMembersChunk')
  async onMembersSync(@Context() [members, guild, data]: ContextOf<'guildMembersChunk'>) {}

  @On('presenceUpdate')
  async onPresenceUpdate(@Context() [old, presence]: ContextOf<'presenceUpdate'>) {}

  @On('messageCreate')
  async onMessage(@Context() [message]: ContextOf<'messageCreate'>) {}

  @On('messageDelete')
  async onMessageDelete(@Context() [message]: ContextOf<'messageDelete'>) {}
}
