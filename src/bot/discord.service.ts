import { Injectable, Logger } from '@nestjs/common';
import {
  GuildChannelCreateOptions,
  GuildManager,
  Snowflake,
  PermissionsBitField,
  GuildForumTagData,
  RoleCreateOptions,
  Role,
  GuildChannel,
  GuildBasedChannel,
  Guild,
  GuildMember,
  MessageCreateOptions,
  Message,
} from 'discord.js';
import { chunk, uniqBy } from 'lodash';
import { SelectTag } from 'src/core/tag/tag.entity';
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
    options: MessageCreateOptions,
  ): Promise<[GuildBasedChannel, Message<true>[]]>;

  abstract ensureForumTags(
    guildSf: Snowflake,
    forumSf: Snowflake,
    tags: GuildForumTagData[],
  ): Promise<GuildForumTagData[]>;

  abstract deleteForumTags(
    guildSf: Snowflake,
    forumSf: Snowflake,
    tags: SelectTag[],
  ): Promise<GuildForumTagData[]>;

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

  constructor(private readonly guildManager: GuildManager) {
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

    if (!bot.permissions.has(PermissionsBitField.Flags.ManageChannels, true)) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges',
        new PermissionsBitField(PermissionsBitField.Flags.ManageChannels).toArray(),
      );
    }

    return await guild.roles.create({ mentionable: true, ...options });
  }

  public async assignRole(guildSf: Snowflake, roleSf: Snowflake, memberSf: Snowflake) {
    const guild = await this.guildManager.fetch(guildSf);
    const role = await guild.roles.fetch(roleSf);
    const member = await guild.members.fetch(memberSf);

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
      const channel = await guild.channels.fetch(channelSf);

      if (channel) {
        // Note: do not overwrite permissions
        return channel;
      }
    }

    const bot = await guild.members.fetchMe();

    if (!bot.permissions.has(PermissionsBitField.Flags.ManageChannels, true)) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges',
        new PermissionsBitField(PermissionsBitField.Flags.ManageChannels).toArray(),
      );
    }

    return await guild.channels.create(options);
  }

  public async sendMessage(
    guildSf: Snowflake,
    channelSf: Snowflake,
    options: MessageCreateOptions,
  ): Promise<[GuildBasedChannel, Message<true>[]]> {
    const discordGuild = await this.guildManager.fetch(guildSf);
    const channel = await discordGuild.channels.fetch(channelSf);

    if (!channel || !channel.isSendable()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', 'Invalid channel');
    }

    const { embeds, ...rest } = options;
    const messages = await chunk(embeds, MAX_EMBEDS).reduce(
      async (promise, embeds) => {
        const messages = await promise;
        messages.push(await channel.send({ ...rest, embeds }));
        return messages;
      },
      Promise.resolve([] as Message<true>[]),
    );

    return [channel, messages];
  }

  public async ensureForumTags(guildSf: Snowflake, forumSf: Snowflake, tags: GuildForumTagData[]) {
    const guild = await this.guildManager.fetch(guildSf);
    const forum = await guild.channels.fetch(forumSf);

    if (!forum.isThreadOnly()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', `Forum ${forum} is not a forum`);
    }

    const bot = await guild.members.fetchMe();

    if (!bot.permissionsIn(forumSf).has(PermissionsBitField.Flags.ManageChannels, true)) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges',
        new PermissionsBitField(PermissionsBitField.Flags.ManageChannels).toArray(),
      );
    }

    const updatedForum = await forum.setAvailableTags(
      uniqBy([...forum.availableTags.concat(), ...tags], 'name'),
    );

    return updatedForum.availableTags.reduce((accumulator, tag) => {
      if (tags.findIndex((template) => tag.name === template.name) > -1) {
        accumulator.push(tag);
      }
      return accumulator;
    }, [] as GuildForumTagData[]);
  }

  public async deleteForumTags(guildSf: Snowflake, forumSf: Snowflake, tags: SelectTag[]) {
    const guild = await this.guildManager.fetch(guildSf);
    const forum = await guild.channels.fetch(forumSf);

    if (!forum.isThreadOnly()) {
      throw new InternalError('INTERNAL_SERVER_ERROR', `Forum ${forum} is not a forum`);
    }

    const bot = await guild.members.fetchMe();

    if (!bot.permissionsIn(forumSf).has(PermissionsBitField.Flags.ManageChannels, true)) {
      throw new ExternalError(
        'INSUFFICIENT_PRIVILEGES',
        'Bot requires additional privileges',
        new PermissionsBitField(PermissionsBitField.Flags.ManageChannels).toArray(),
      );
    }

    const deleted: GuildForumTagData[] = [];
    const keep: GuildForumTagData[] = [];

    for (const tag of forum.availableTags) {
      if (tags.findIndex((t) => t.tagSf === tag.id) > -1) {
        deleted.push(tag);
      } else {
        keep.push(tag);
      }
    }

    await forum.setAvailableTags(keep);

    return deleted;
  }

  async deleteChannel(guildSf: Snowflake, channelSf: Snowflake) {
    const guild = await this.guildManager.fetch(guildSf);
    return guild.channels.delete(channelSf);
  }

  async deleteRole(guildSf: Snowflake, roleSf: Snowflake) {
    const guild = await this.guildManager.fetch(guildSf);
    return guild.roles.delete(roleSf);
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

    if (maybeChannel instanceof GuildChannel) {
      channel = maybeChannel;
      guild = channel.guild;
    } else {
      guild = await this.guildManager.fetch(maybeChannel);
      channel = await guild.channels.fetch(channelRef);
    }

    return !channel
      .permissionsFor(guild.roles.everyone, false)
      .has(PermissionsBitField.Flags.ViewChannel);
  }
}
