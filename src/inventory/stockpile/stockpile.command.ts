import { Injectable, Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  AttachmentOption,
  Context,
  Options,
  SlashCommandContext,
  StringOption,
  Subcommand,
} from 'necord';
import { Attachment, GuildManager, PermissionsBitField } from 'discord.js';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { DeltaCommand } from 'src/inventory/inventory.command-group';
import { PoiSelectAutocompleteInterceptor } from 'src/game/poi/poi-select.interceptor';
import { AuthError } from 'src/errors';
import { GuildService } from 'src/core/guild/guild.service';
import { StockpileService } from './stockpile.service';
import { SuccessEmbed } from 'src/bot/embed';
import { BotService } from 'src/bot/bot.service';

export class CreateStockpileCommandParams {
  @StringOption({
    name: 'location',
    description: 'Select which location you are updating',
    autocomplete: true,
    required: true,
  })
  locationId: string;

  @StringOption({
    name: 'name',
    description: 'Name of the stockpile, as it appears in-game',
    autocomplete: false,
    required: true,
  })
  name: string;

  @StringOption({
    name: 'code',
    description: 'Stockpile code, as it appears in-game',
    autocomplete: false,
    required: false,
  })
  code: string;
}

export class SelectStockpileCommandParams {
  @StringOption({
    name: 'stockpile',
    description: 'Select a stockpile',
    autocomplete: true,
    required: true,
  })
  stockpileId: string;
}

export class UpdateStockpileCommandParams extends SelectStockpileCommandParams {
  @StringOption({
    name: 'code',
    description: 'New code',
    autocomplete: false,
    required: true,
  })
  code: string;
}

export class StockpileLogCommandParams {
  @StringOption({
    name: 'location',
    description: 'Select which location you are updating',
    autocomplete: true,
    required: true,
  })
  locationId: string;

  @StringOption({
    name: 'message',
    description: 'Describe your update',
    autocomplete: false,
    required: true,
  })
  message: string;

  @AttachmentOption({
    name: 'report',
    description: 'Upload a FIR TSV report',
    required: true,
  })
  reportAttachment: Attachment;

  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crewId: string;
}

@Injectable()
@DeltaCommand({
  name: 'stockpile',
  description: 'Manage stockpiles',
})
@UseFilters(DiscordExceptionFilter)
export class StockpileCommand {
  private readonly logger = new Logger(StockpileCommand.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly guildService: GuildService,
    private readonly botService: BotService,
    private readonly stockpileService: StockpileService,
  ) {}

  @UseInterceptors(PoiSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'create',
    description: 'Create a stockpile',
    dmPermission: false,
  })
  async onCreateStockpile(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: CreateStockpileCommandParams,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const discordGuild = await this.guildManager.fetch(interaction.guildId);
    const member = await discordGuild.members.fetch(interaction);
    const guild = await this.guildService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .getOneOrFail();

    if (
      guild.config?.stockpileCreatorRole &&
      !interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator) &&
      !member.roles.cache.has(guild.config.stockpileCreatorRole)
    ) {
      throw new AuthError('FORBIDDEN', 'Not allowed to create stockpiles').asDisplayable();
    }

    const stockpile = await this.stockpileService.registerStockpile({
      name: data.name?.trim(),
      code: data.code?.trim(),
      locationId: data.locationId,
      guildId: guild.id,
      createdBy: memberRef,
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Stockpile registered')],
    });
  }
}
