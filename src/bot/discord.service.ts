import { Injectable, Logger } from '@nestjs/common';
import {
  GuildChannelCreateOptions,
  GuildManager,
  Snowflake,
  PermissionsBitField,
  GuildForumTagData,
} from 'discord.js';
import _ from 'lodash';
import { SelectTag } from 'src/core/tag/tag.entity';
import { BaseError } from 'src/errors';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  constructor(private readonly guildManager: GuildManager) {}

  public async ensureRole(guildSf: Snowflake, roleSf: Snowflake | undefined, name: string) {
    const guild = await this.guildManager.fetch(guildSf);

    if (roleSf) {
      const role = guild.roles.fetch(roleSf);

      if (role) {
        return role;
      }
    }

    const roles = await guild.roles.fetch();
    const maybeRole = roles.find((role) => role.name.toLowerCase() === name.toLowerCase());

    const bot = await guild.members.fetchMe();
    if (!bot.permissions.has(PermissionsBitField.Flags.ManageRoles, true)) {
      throw new BaseError('BOT_FORBIDDEN', 'LogiBot requires additional privileges: Manage Roles');
    }

    return (
      maybeRole ??
      (await guild.roles.create({
        name,
        mentionable: true,
      }))
    );
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
        return channel;
      }
    }

    const channels = await guild.channels.fetch();
    const maybeChannel = channels.find(
      (channel) =>
        channel.name.toLowerCase() === options.name.toLowerCase() &&
        channel.parentId === options.parent,
    );

    const bot = await guild.members.fetchMe();
    if (!bot.permissions.has(PermissionsBitField.Flags.ManageChannels, true)) {
      throw new BaseError(
        'BOT_FORBIDDEN',
        'LogiBot requires additional privileges: Manage Channels',
      );
    }

    return maybeChannel ?? (await guild.channels.create(options));
  }

  public async ensureForumTags(guildSf: Snowflake, forumSf: Snowflake, tags: GuildForumTagData[]) {
    const guild = await this.guildManager.fetch(guildSf);
    const forum = await guild.channels.fetch(forumSf);

    if (!forum.isThreadOnly()) {
      throw new BaseError('INTERNAL_SERVER_ERROR', `${forum} is not a forum`);
    }

    const bot = await guild.members.fetchMe();
    if (!bot.permissionsIn(forumSf).has(PermissionsBitField.Flags.ManageChannels, true)) {
      throw new BaseError(
        'BOT_FORBIDDEN',
        'LogiBot requires additional privileges: Manage Channels',
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
      throw new BaseError('INTERNAL_SERVER_ERROR', `${forum} is not a forum`);
    }

    const bot = await guild.members.fetchMe();
    if (!bot.permissionsIn(forumSf).has(PermissionsBitField.Flags.ManageChannels, true)) {
      throw new BaseError(
        'BOT_FORBIDDEN',
        'LogiBot requires additional privileges: Manage Channels',
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
