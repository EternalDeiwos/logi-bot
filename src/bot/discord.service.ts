import { Injectable, Logger } from '@nestjs/common';
import {
  GuildChannelCreateOptions,
  GuildManager,
  Snowflake,
  PermissionsBitField,
  RoleCreateOptions,
  Role,
  GuildBasedChannel,
  Guild,
  GuildMember,
  MessageCreateOptions,
  Message,
  User,
  Client,
  DMChannel,
  CategoryChannel,
} from 'discord.js';
import { chunk } from 'lodash';
import { ExternalError, InternalError } from 'src/errors';

export const MAX_EMBEDS = 8;

export abstract class DiscordService {
  abstract hasRole(
    guildSf: Snowflake,
    memberSf: Snowflake,
    roleSf: Snowflake,
    checkAdmin?: boolean,
  ): Promise<boolean>;

  abstract ensureRole(
    guildSf: Snowflake,
    roleSf: Snowflake | undefined,
    options: RoleCreateOptions,
  ): Promise<Role>;

  abstract assignRole(
    guildSf: Snowflake,
    roleSf: Snowflake,
    memberSf: Snowflake,
  ): Promise<GuildMember>;

  abstract removeRole(
    guildSf: Snowflake,
    roleSf: Snowflake,
    memberSf: Snowflake,
  ): Promise<[GuildMember, Role]>;

  abstract ensureChannel(
    guildSf: Snowflake,
    channelSf: Snowflake | undefined,
    options: GuildChannelCreateOptions,
  ): Promise<GuildBasedChannel>;

  abstract sendMessage(
    guildSf: Snowflake,
    channelSf: Snowflake,
    options: MessageCreateOptions & { id?: Snowflake },
  ): Promise<[GuildBasedChannel, Message<true>[]]>;

  abstract sendDM(
    userSf: Snowflake,
    options: MessageCreateOptions,
  ): Promise<[User, Message<false>[]]>;

  abstract deleteChannel(guildSf: Snowflake, channelSf: Snowflake): Promise<void>;
  abstract deleteRole(guildSf: Snowflake, roleSf: Snowflake): Promise<void>;
  abstract deleteMessages(
    guildSf: Snowflake,
    channelSf: Snowflake,
    messageSf: Snowflake | Snowflake[],
  ): Promise<Snowflake[]>;

  abstract isChannelPrivate(channel: GuildBasedChannel): Promise<boolean>;
  abstract isChannelPrivate(guildRef: Snowflake, channelRef: Snowflake): Promise<boolean>;
}

@Injectable()
export class DiscordServiceImpl extends DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  constructor(
    private readonly client: Client,
    private readonly guildManager: GuildManager,
  ) {
    super();
  }

  public async hasRole(
    guildSf: Snowflake,
    memberSf: Snowflake,
    roleSf: Snowflake,
    checkAdmin = true,
  ) {
    const guild = await this.guildManager.fetch(guildSf);
    const member = await guild.members.fetch(memberSf);

    return (
      member.roles.cache.has(roleSf) ||
      (checkAdmin && member.permissions.has(PermissionsBitField.Flags.Administrator))
    );
  }

  public async ensureRole(
    guildSf: Snowflake,
    roleSf: Snowflake | undefined,
    options: RoleCreateOptions,
  ) {
    const guild = await this.guildManager.fetch(guildSf);

    if (roleSf) {
      const role = await guild.roles.fetch(roleSf);

      if (role) {
        return role;
      }
    }

    const roles = await guild.roles.fetch();
    const maybeRole = roles.find((role) => role.name.toLowerCase() === options.name.toLowerCase());

    if (maybeRole) {
      return maybeRole;
    }

    const bot = await guild.members.fetchMe();

    if (!bot.roles.botRole.permissions.has(PermissionsBitField.Flags.ManageRoles, true)) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges: Manage Roles',
      ).asDisplayable();
    }

    return await guild.roles.create({ mentionable: true, ...options });
  }

  public async assignRole(guildSf: Snowflake, roleSf: Snowflake, memberSf: Snowflake) {
    const guild = await this.guildManager.fetch(guildSf);
    const role = await guild.roles.fetch(roleSf);
    const member = await guild.members.fetch(memberSf);
    const bot = await guild.members.fetchMe();

    if (!bot.roles.botRole.permissions.has(PermissionsBitField.Flags.ManageRoles, true)) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges: Manage Roles',
      ).asDisplayable();
    }

    if (role.members.has(member.id)) {
      return member;
    } else {
      return member.roles.add(role);
    }
  }

  public async removeRole(
    guildSf: Snowflake,
    roleSf: Snowflake,
    memberSf: Snowflake,
  ): Promise<[GuildMember, Role]> {
    const guild = await this.guildManager.fetch(guildSf);
    const role = await guild.roles.fetch(roleSf);
    const member = await guild.members.fetch(memberSf);
    const bot = await guild.members.fetchMe();

    if (!bot.roles.botRole.permissions.has(PermissionsBitField.Flags.ManageRoles, true)) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges: Manage Roles',
      ).asDisplayable();
    }

    if (role.members.has(member.id)) {
      return [await member.roles.remove(role), role];
    } else {
      return [member, role];
    }
  }

  public async ensureChannel(
    guildSf: Snowflake,
    channelSf: Snowflake | undefined,
    options: GuildChannelCreateOptions,
  ) {
    const guild = await this.guildManager.fetch(guildSf);

    if (channelSf) {
      try {
        const channel = await guild.channels.fetch(channelSf);
        return channel;
      } catch {
        this.logger.warn(`Channel ${channelSf} no longer exists in ${guild.name}`);
      }
    }

    const bot = await guild.members.fetchMe();
    let category: GuildBasedChannel;

    try {
      if (options.parent) {
        category = await guild.channels.fetch(
          options?.parent && typeof options.parent === 'string'
            ? options.parent
            : (options.parent as CategoryChannel).id,
        );
      }
    } catch (err) {
      this.logger.warn(`Category ${options?.parent} no longer exists in ${guild.name}`);
    }

    if (
      category
        ? !category.permissionsFor(bot).has(PermissionsBitField.Flags.ManageChannels, true)
        : !bot.roles.botRole.permissions.has(PermissionsBitField.Flags.ManageChannels, true)
    ) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges: Manage Channels',
      ).asDisplayable();
    }

    return await guild.channels.create(options);
  }

  public async sendMessage(
    guildSf: Snowflake,
    channelSf: Snowflake,
    message: MessageCreateOptions & { id?: Snowflake },
  ): Promise<[GuildBasedChannel, Message<true>[]]> {
    const { id, ...options } = message;
    const discordGuild = await this.guildManager.fetch(guildSf);
    let channel: GuildBasedChannel;

    try {
      channel = await discordGuild.channels.fetch(channelSf);
    } catch (err) {
      this.logger.warn(`Unable to fetch channel ${channelSf} in ${discordGuild.name}`);
    }

    if (!channel?.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const bot = await discordGuild.members.fetchMe();

    if (!bot.permissionsIn(channel).has(PermissionsBitField.Flags.SendMessages, true)) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges: Send Messages',
      ).asDisplayable();
    }

    const existingMessage = await channel.messages.fetch(id);

    const { embeds, flags, ...rest } = options;
    const chunkedEmbeds = chunk(embeds, MAX_EMBEDS);

    if (chunkedEmbeds.length > 1) {
      const messages = await chunkedEmbeds.reduce(
        async (promise, embeds) => {
          const messages = await promise;
          messages.push(await channel.send({ ...rest, flags, embeds }));
          return messages;
        },
        Promise.resolve([] as Message<true>[]),
      );

      return [channel, messages];
    } else if (existingMessage && existingMessage.editable) {
      const message = await existingMessage.edit({ ...rest, embeds });
      return [channel, [message]];
    } else {
      const message = await channel.send({ ...rest, flags, embeds });
      return [channel, [message]];
    }
  }

  public async sendDM(
    userSf: Snowflake,
    options: MessageCreateOptions,
  ): Promise<[User, Message<false>[]]> {
    const user = await this.client.users.fetch(userSf);
    let channel: DMChannel;

    try {
      channel = await user.createDM();
    } catch (err) {
      this.logger.warn(`Unable to open DM channel to ${user?.displayName} (${userSf})`);
    }

    if (!channel?.isTextBased()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const { embeds, ...rest } = options;
    const messages = await chunk(embeds, MAX_EMBEDS).reduce(
      async (promise, embeds) => {
        const messages = await promise;
        messages.push(await channel.send({ ...rest, embeds }));
        return messages;
      },
      Promise.resolve([] as Message<false>[]),
    );

    return [user, messages];
  }

  async deleteChannel(guildSf: Snowflake, channelSf: Snowflake) {
    const guild = await this.guildManager.fetch(guildSf);
    const bot = await guild.members.fetchMe();
    let channel: GuildBasedChannel;

    try {
      channel = await guild.channels.fetch(channelSf);
    } catch (err) {
      this.logger.warn(`Channel ${channelSf} no longer exists in ${guild.name}`);
      return;
    }

    if (
      channel
        ? !channel.permissionsFor(bot).has(PermissionsBitField.Flags.ManageChannels, true)
        : !bot.roles.botRole.permissions.has(PermissionsBitField.Flags.ManageChannels, true)
    ) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges: Manage Channels',
      ).asDisplayable();
    }

    if (channel) {
      await channel.delete();
    }
  }

  async deleteRole(guildSf: Snowflake, roleSf: Snowflake) {
    const guild = await this.guildManager.fetch(guildSf);
    const bot = await guild.members.fetchMe();

    if (!bot.roles.botRole.permissions.has(PermissionsBitField.Flags.ManageRoles, true)) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges: Manage Roles',
      ).asDisplayable();
    }

    if (roleSf) {
      try {
        const role = await guild.roles.fetch(roleSf);
        await role.delete();
      } catch {
        this.logger.warn(`Role ${roleSf} no longer exists in ${guild.name}`);
      }
    }
  }

  async deleteMessages(
    guildSf: Snowflake,
    channelSf: Snowflake,
    messageSf: Snowflake | Snowflake[],
  ) {
    if (!Array.isArray(messageSf)) {
      messageSf = [messageSf];
    }

    const guild = await this.guildManager.fetch(guildSf);
    const channel = await guild.channels.fetch(channelSf);
    const bot = await guild.members.fetchMe();

    if (!bot.permissionsIn(channel).has(PermissionsBitField.Flags.ManageMessages, true)) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges: Manage Messages',
      ).asDisplayable();
    }

    if (channel.isTextBased()) {
      if (messageSf.length > 1) {
        return Array.from((await channel.bulkDelete(messageSf, true)).keys());
      } else if (messageSf.length) {
        const [oneMessageSf] = messageSf;
        await channel.messages.delete(oneMessageSf);
        return [oneMessageSf];
      }
      return [];
    }
  }

  async isChannelPrivate(
    maybeChannel: Snowflake | GuildBasedChannel,
    channelRef?: Snowflake,
  ): Promise<boolean> {
    let channel: GuildBasedChannel;
    let guild: Guild;

    if (typeof maybeChannel === 'string') {
      try {
        guild = await this.guildManager.fetch(maybeChannel);
        channel = await guild.channels.fetch(channelRef);
      } catch (err) {
        throw new ExternalError('DISCORD_API_ERROR', `Failed to resolve channel: ${channelRef}`);
      }
    } else {
      channel = maybeChannel;
      guild = channel.guild;
    }

    return !channel
      .permissionsFor(guild.roles.everyone, false)
      .has(PermissionsBitField.Flags.ViewChannel);
  }
}
