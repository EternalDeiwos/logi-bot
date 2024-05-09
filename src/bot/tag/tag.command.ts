import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommandContext, StringOption, Subcommand } from 'necord';
import { ConfigService } from 'src/config';
import { EchoCommand } from 'src/bot/echo.command-group';
import { TeamService } from 'src/bot/team/team.service';
import { TagService } from './tag.service';

export class CreateTagCommandParams {
  @StringOption({
    name: 'name',
    description: 'Tag name',
    required: true,
  })
  name: string;
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

    const result = await this.teamService.reconcileGuildForumTags(interaction.guild);
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

    const result = await this.teamService.reconcileGuildForumTags(interaction.guild);
    return interaction.reply({ content: result.message, ephemeral: true });
  }

  @Subcommand({
    name: 'refresh',
    description: 'Reconcile expected tags on forums. Does not affect threads.',
    dmPermission: false,
  })
  async onRefreshTags(@Context() [interaction]: SlashCommandContext) {
    const result = await this.teamService.reconcileGuildForumTags(interaction.guild);
    return interaction.reply({ content: result.message, ephemeral: true });
  }
}
