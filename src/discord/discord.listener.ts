import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';

@Injectable()
export class BotEventListener {
  private readonly logger = new Logger(BotEventListener.name, { timestamp: true });

  constructor(private readonly rmq: AmqpConnection) {}

  @On('ready')
  async onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @On('guildCreate')
  async onGuildCreate(@Context() [guild]: ContextOf<'guildCreate'>) {}

  @On('guildDelete')
  async onGuildDelete(@Context() [guild]: ContextOf<'guildDelete'>) {}

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

  @On('messageDelete')
  async onMessageDelete(@Context() [message]: ContextOf<'messageDelete'>) {}
}
