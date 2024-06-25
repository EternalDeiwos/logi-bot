import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import {
  Button,
  ButtonContext,
  ComponentParam,
  Context,
  Options,
  SlashCommandContext,
  StringOption,
  Subcommand,
} from 'necord';
import { ConfigService } from 'src/config';
import { EchoCommand } from 'src/bot/echo.command-group';
import { TeamService } from 'src/bot/team/team.service';
import { TagService } from './tag.service';
import { TagSelectAutocompleteInterceptor } from './tag-select.interceptor';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export class CreateTagCommandParams {
  @StringOption({
    name: 'name',
    description: 'Tag name',
    required: true,
  })
  name: string;
}

export class SelectTagCommandParams {
  @StringOption({
    name: 'tag',
    description: 'Select a tag',
    autocomplete: true,
    required: false,
  })
  tag: string;
}

@Injectable()
@EchoCommand({
  name: 'tag',
  description: 'Manage tags for forum posts (tickets)',
})
export class TagCommand {
  private readonly logger = new Logger(TagCommand.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly teamService: TeamService,
    private readonly tagService: TagService,
  ) {}

  @Subcommand({
    name: 'create',
    description: 'Create a guild-wide tag. Guild admin only.',
    dmPermission: false,
  })
  async onNewTag(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: CreateTagCommandParams,
  ) {
    const member = await interaction.guild.members.fetch(interaction.user);
    const createResult = await this.tagService.createTag(data.name, member);

    if (!createResult.success) {
      return interaction.reply({ content: createResult.message, ephemeral: true });
    }

    const result = await this.teamService.reconcileGuildForumTags(interaction.guildId);
    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @Subcommand({
    name: 'setup',
    description: 'Set up basic ticket lifecycle tags. Guild admin only.',
    dmPermission: false,
  })
  async onSetupTags(@Context() [interaction]: SlashCommandContext) {
    const member = await interaction.guild.members.fetch(interaction.user);
    const createResult = await this.tagService.createTicketTags(member);

    if (!createResult.success) {
      return interaction.reply({ content: createResult.message, ephemeral: true });
    }

    const result = await this.teamService.reconcileGuildForumTags(interaction.guildId);
    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @Subcommand({
    name: 'refresh',
    description: 'Reconcile expected tags on forums. Does not affect threads.',
    dmPermission: false,
  })
  async onRefreshTags(@Context() [interaction]: SlashCommandContext) {
    const result = await this.teamService.reconcileGuildForumTags(interaction.guildId);
    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @UseInterceptors(TagSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'delete',
    description: 'Remove a tag',
    dmPermission: false,
  })
  async onTagDelete(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectTagCommandParams,
  ) {
    if (!data.tag) {
      const confirm = new ButtonBuilder()
        .setCustomId('tags/destroy/all')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirm);

      return interaction.reply({
        content: 'Are you sure you want to delete all forum tags? This action cannot be reversed.',
        components: [row],
        ephemeral: true,
      });
    }

    const member = await interaction.guild.members.fetch(interaction.user);
    let result = await this.tagService.deleteTags(member, data.tag && [data.tag]);

    if (!result.success) {
      return interaction.reply({ content: result.message, ephemeral: true });
    }

    result = await this.tagService.deleteTagTemplates(member, data.tag && [data.tag]);

    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @Button('tags/destroy/all')
  async onTagsDeleteConfirm(@Context() [interaction]: ButtonContext) {
    const member = await interaction.guild.members.fetch(interaction.user);
    let result = await this.tagService.deleteTags(member);

    if (!result.success) {
      return interaction.reply({ content: result.message, ephemeral: true });
    }

    result = await this.tagService.deleteTagTemplates(member);

    return interaction.reply({ content: result.message, ephemeral: true });
  }
}
