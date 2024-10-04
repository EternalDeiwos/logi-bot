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
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import { AuthError } from 'src/errors';
import { EchoCommand } from 'src/core/echo.command-group';
import { SuccessEmbed } from 'src/bot/embed';
import { BotService } from 'src/bot/bot.service';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { GuildService } from 'src/core/guild/guild.service';
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
    private readonly guildService: GuildService,
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
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const guildRef = { guildSf: interaction.guildId };
    const result = await this.tagService.createTag(guildRef, memberRef, data.name);
    await this.teamService.reconcileGuildForumTags(guildRef);
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
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    const guildRef: SelectGuild = { guildSf: interaction.guildId };
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const result = await this.tagService.createTicketTags(guildRef, memberRef);
    await this.teamService.reconcileGuildForumTags(guildRef);
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
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    const result = await this.teamService.reconcileGuildForumTags({ guildSf: interaction.guildId });
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
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

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
    const result = await this.tagService.deleteTagsByTemplate(member, data.tag && [data.tag]);

    await this.tagService.deleteTagTemplates(member, data.tag && [data.tag]);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Tag(s) deleted')],
    });
  }

  @Button('tags/destroy/all')
  async onTagsDeleteConfirm(@Context() [interaction]: ButtonContext) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    const member = await interaction.guild.members.fetch(interaction.user);
    const result = await this.tagService.deleteTagsByTemplate(member);

    await this.tagService.deleteTagTemplates(member);

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Tag(s) deleted')],
    });
  }
}
