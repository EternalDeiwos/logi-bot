import { Injectable, Logger } from '@nestjs/common';
import {
  GuildChannelCreateOptions,
  GuildManager,
  Snowflake,
  PermissionsBitField,
  GuildForumTagData,
  RoleCreateOptions,
  Role,
  GuildBasedChannel,
} from 'discord.js';
import _ from 'lodash';
import { SelectTag } from 'src/core/tag/tag.entity';
import { ExternalError, InternalError } from 'src/errors';

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

  abstract ensureChannel(
    guildSf: Snowflake,
    channelSf: Snowflake | undefined,
    options: GuildChannelCreateOptions,
  ): Promise<GuildBasedChannel>;

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

    const channels = await guild.channels.fetch();
    const maybeChannel = channels.find(
      (channel) =>
        channel.name.toLowerCase() === options.name.toLowerCase() &&
        channel.parentId === options.parent,
    );

    if (maybeChannel) {
      if (options.permissionOverwrites) {
        await maybeChannel.permissionOverwrites.set(options.permissionOverwrites);
      }

      return maybeChannel;
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
      _.uniqBy([...forum.availableTags.concat(), ...tags], 'name'),
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
      if (tags.findIndex((t) => t.tag === tag.id) > -1) {
        deleted.push(tag);
      } else {
        keep.push(tag);
      }
    }

    await forum.setAvailableTags(keep);

    return deleted;
  }
}
