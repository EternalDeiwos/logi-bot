import { Injectable, Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  Button,
  ButtonContext,
  Context,
  Options,
  SlashCommandContext,
  StringOption,
  Subcommand,
} from 'necord';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EchoCommand } from 'src/core/echo.command-group';
import { SuccessEmbed } from 'src/bot/embed';
import { BotService } from 'src/bot/bot.service';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { TeamService } from 'src/core/team/team.service';
import { TagService } from './tag.service';
import { TagSelectAutocompleteInterceptor } from './tag-select.interceptor';

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
@UseFilters(DiscordExceptionFilter)
export class TagCommand {
  private readonly logger = new Logger(TagCommand.name);

  constructor(
    private readonly botService: BotService,
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
    const result = await this.tagService.createTag(data.name, member);
    await this.teamService.reconcileGuildForumTags({ guild: interaction.guildId });
    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Tag registered')],
    });
  }

  @Subcommand({
    name: 'setup',
    description: 'Set up basic ticket lifecycle tags. Guild admin only.',
    dmPermission: false,
  })
  async onSetupTags(@Context() [interaction]: SlashCommandContext) {
    const member = await interaction.guild.members.fetch(interaction.user);
    const result = await this.tagService.createTicketTags(member);
    await this.teamService.reconcileGuildForumTags({ guild: interaction.guildId });
    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Lifecycle tags registered')],
    });
  }

  @Subcommand({
    name: 'refresh',
    description: 'Reconcile expected tags on forums. Does not affect threads.',
    dmPermission: false,
  })
  async onRefreshTags(@Context() [interaction]: SlashCommandContext) {
    const result = await this.teamService.reconcileGuildForumTags({ guild: interaction.guildId });
    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Refresh scheduled')],
    });
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
    const result = await this.tagService.deleteTags(member, data.tag && [data.tag]);

    await this.tagService.deleteTagTemplates(member, data.tag && [data.tag]);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Tag(s) deleted')],
    });
  }

  @Button('tags/destroy/all')
  async onTagsDeleteConfirm(@Context() [interaction]: ButtonContext) {
    const member = await interaction.guild.members.fetch(interaction.user);
    const result = await this.tagService.deleteTags(member);

    await this.tagService.deleteTagTemplates(member);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Tag(s) deleted')],
    });
  }
}
