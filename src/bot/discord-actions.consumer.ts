import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';
import { GuildChannelCreateOptions, MessageCreateOptions, RoleCreateOptions } from 'discord.js';
import { DiscordService } from './discord.service';

export enum DiscordActionType {
  ENSURE_ROLE = 'role.ensure',
  ASSIGN_ROLE = 'role.assign',
  REMOVE_ROLE = 'role.remove',
  DELETE_ROLE = 'role.delete',
  ENSURE_CHANNEL = 'channel.ensure',
  // REPLACE_CHANNEL = 'channel.replace',
  DELETE_CHANNEL = 'channel.delete',
  SEND_MESSAGE = 'message.send',
  // UPDATE_MESSAGE = 'message.update',
  DELETE_MESSAGES = 'message.delete',
}

export enum DiscordActionTarget {
  GUILD = 'guild',
  TEAM = 'team',
  CREW = 'crew',
  CREW_MEMBER = 'crew_member',
}

type Target = {
  field?: string;
  target?:
    | { type: DiscordActionTarget.GUILD; guildSf: string }
    | { type: DiscordActionTarget.TEAM; teamId: string }
    | { type: DiscordActionTarget.CREW; crewId: string }
    | { type: DiscordActionTarget.CREW_MEMBER; crewId: string; memberSf: string };
};

export type DiscordAction = Target & { guildSf: string } & (
    | { type: DiscordActionType.ENSURE_ROLE; role: RoleCreateOptions & { id?: string } }
    | {
        type: DiscordActionType.ASSIGN_ROLE;
        roleSf: string;
        memberSf: string;
      }
    | {
        type: DiscordActionType.REMOVE_ROLE;
        roleSf: string;
        memberSf: string;
      }
    | {
        type: DiscordActionType.ENSURE_CHANNEL;
        channel: GuildChannelCreateOptions & { id?: string };
      }
    | {
        type: DiscordActionType.DELETE_CHANNEL;
        channelSf: string;
      }
    | {
        type: DiscordActionType.DELETE_ROLE;
        roleSf: string;
      }
    | {
        type: DiscordActionType.DELETE_MESSAGES;
        channelSf: string;
        messageSf: string | string[];
      }
    | {
        type: DiscordActionType.SEND_MESSAGE;
        channelSf: string;
        message: MessageCreateOptions & { id?: string };
      }
  );

export type DiscordActionResponse = Target & { guildSf: string } & (
    | { type: DiscordActionType.ENSURE_ROLE; roleSf: string }
    | {
        type: DiscordActionType.ASSIGN_ROLE;
        roleSf: string;
        memberSf: string;
      }
    | {
        type: DiscordActionType.REMOVE_ROLE;
        roleSf: string;
        memberSf: string;
      }
    | {
        type: DiscordActionType.ENSURE_CHANNEL;
        channelSf: string;
      }
    | {
        type: DiscordActionType.DELETE_CHANNEL;
        channelSf: string;
      }
    | {
        type: DiscordActionType.DELETE_ROLE;
        roleSf: string;
      }
    | {
        type: DiscordActionType.DELETE_MESSAGES;
        channelSf: string;
        messageSf: string[];
      }
    | {
        type: DiscordActionType.SEND_MESSAGE;
        channelSf: string;
        messageSf: string[];
      }
  );

@Injectable()
export class DiscordActionsConsumer {
  private readonly logger = new Logger(DiscordActionsConsumer.name);

  constructor(
    private readonly rmq: AmqpConnection,
    private readonly discordService: DiscordService,
  ) {}

  private async respond(response: DiscordActionResponse) {
    if (!response.target) {
      return;
    }

    await this.rmq.publish(
      'discord',
      `response.${response.target.type}.${response.type}`,
      // e.g.
      // response.crew.role.create
      // response.guild.role.create
      response,
    );
  }

  @RabbitSubscribe({
    exchange: 'discord',
    routingKey: 'action.#',
    queue: 'discord-actions-processing',
    queueOptions: {
      deadLetterExchange: 'retry',
    },
  })
  public async processDiscordAction(payload: DiscordAction, msg: ConsumeMessage) {
    const { type, target, ...rest } = payload;

    switch (type) {
      case DiscordActionType.ENSURE_ROLE:
        return this.ensureRole(payload);

      case DiscordActionType.ENSURE_CHANNEL:
        return this.ensureChannel(payload);

      case DiscordActionType.ASSIGN_ROLE:
        return this.assignRole(payload);

      case DiscordActionType.REMOVE_ROLE:
        return this.removeRole(payload);

      case DiscordActionType.DELETE_CHANNEL:
        return this.deleteChannel(payload);

      case DiscordActionType.DELETE_ROLE:
        return this.deleteRole(payload);

      case DiscordActionType.DELETE_MESSAGES:
        return this.deleteMessages(payload);

      case DiscordActionType.SEND_MESSAGE:
        return this.sendMessage(payload);

      default:
        this.logger.debug(`Failed to process discord action ${type}\n${JSON.stringify(rest)}`);
        this.logger.error(`Failed to process discord action ${type}`);
    }
  }

  private async ensureRole(payload: { type: DiscordActionType.ENSURE_ROLE } & DiscordAction) {
    const { type, target, guildSf } = payload;
    const { id, ...options } = payload.role;
    this.logger.debug(
      `Ensuring role ${options.name}` + target ? ` for target ${JSON.stringify(target)}` : '',
    );
    const role = await this.discordService.ensureRole(guildSf, id, options);
    this.logger.log(`Ensured role ${role.name} in ${role.guild.name}`);
    return await this.respond({ type, target, guildSf, roleSf: role.id });
  }

  private async ensureChannel(
    payload: {
      type: DiscordActionType.ENSURE_CHANNEL;
    } & DiscordAction,
  ) {
    const { type, target, guildSf } = payload;
    const { id, ...options } = payload.channel;
    this.logger.debug(
      `Ensuring channel ${options.name}` + (target ? ` for target ${JSON.stringify(target)}` : ''),
    );
    const channel = await this.discordService.ensureChannel(guildSf, id, options);
    this.logger.log(`Ensured channel ${channel.name} in ${channel.guild.name}`);
    return await this.respond({ type, target, guildSf, channelSf: channel.id });
  }

  private async assignRole(
    payload: {
      type: DiscordActionType.ASSIGN_ROLE;
    } & DiscordAction,
  ) {
    const { type, target, guildSf, roleSf, memberSf } = payload;
    this.logger.debug(
      `Ensuring role ${roleSf} membership for ${memberSf}` + target
        ? ` for target ${JSON.stringify(target)}`
        : '',
    );
    const member = await this.discordService.assignRole(guildSf, roleSf, memberSf);
    this.logger.log(
      `Ensured role ${member.roles.cache.get(roleSf).name} membership for ${member.displayName} in ${member.guild.name}`,
    );
    return await this.respond({ type, target, guildSf, memberSf, roleSf });
  }

  private async removeRole(
    payload: {
      type: DiscordActionType.REMOVE_ROLE;
    } & DiscordAction,
  ) {
    const { type, target, guildSf, roleSf, memberSf } = payload;
    this.logger.debug(
      `Removing role ${roleSf} membership for ${memberSf}` + target
        ? ` for target ${JSON.stringify(target)}`
        : '',
    );
    const [member, role] = await this.discordService.removeRole(guildSf, roleSf, memberSf);
    this.logger.log(
      `Removed role ${role.name} membership for ${member.displayName} in ${member.guild.name}`,
    );
    return await this.respond({ type, target, guildSf, memberSf, roleSf });
  }

  private async deleteChannel(
    payload: {
      type: DiscordActionType.DELETE_CHANNEL;
    } & DiscordAction,
  ) {
    const { type, target, guildSf, channelSf } = payload;
    this.logger.debug(
      `Deleting channel ${channelSf} in guild ${guildSf}` + target
        ? ` for target ${JSON.stringify(target)}`
        : '',
    );
    await this.discordService.deleteChannel(guildSf, channelSf);
    this.logger.log(`Deleted channel ${channelSf} in guild ${guildSf}`);
    return await this.respond({ type, target, guildSf, channelSf });
  }

  private async deleteRole(
    payload: {
      type: DiscordActionType.DELETE_ROLE;
    } & DiscordAction,
  ) {
    const { type, target, guildSf, roleSf } = payload;
    this.logger.debug(
      `Deleting channel ${roleSf} in guild ${guildSf}` + target
        ? ` for target ${JSON.stringify(target)}`
        : '',
    );
    await this.discordService.deleteChannel(guildSf, roleSf);
    this.logger.log(`Deleted channel ${roleSf} in guild ${guildSf}`);
    return await this.respond({ type, target, guildSf, roleSf });
  }

  private async deleteMessages(
    payload: {
      type: DiscordActionType.DELETE_MESSAGES;
    } & DiscordAction,
  ) {
    const { type, target, guildSf, channelSf, messageSf } = payload;

    this.logger.debug(
      `Deleting channel ${channelSf} in guild ${guildSf}` + target
        ? ` for target ${JSON.stringify(target)}`
        : '',
    );
    const deleted = await this.discordService.deleteMessages(guildSf, channelSf, messageSf);
    this.logger.log(`Deleted channel ${channelSf} in guild ${guildSf}`);
    return await this.respond({ type, target, guildSf, channelSf, messageSf: deleted });
  }

  private async sendMessage(
    payload: {
      type: DiscordActionType.SEND_MESSAGE;
    } & DiscordAction,
  ) {
    const { type, target, guildSf, channelSf, message } = payload;
    this.logger.debug(
      `Sending message in guild ${guildSf}` + target ? ` for target ${JSON.stringify(target)}` : '',
    );
    const [channel, messages] = await this.discordService.sendMessage(guildSf, channelSf, message);
    this.logger.log(
      `Sent messages ${JSON.stringify(messages.map((m) => [m.id, m.embeds.length]))} in channel ${channel.name} for guild ${channel.guild.name}`,
    );
    return await this.respond({
      type,
      target,
      guildSf,
      channelSf,
      messageSf: messages.map((m) => m.id),
    });
  }
}
