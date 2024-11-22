import { Injectable, Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  AttachmentOption,
  Context,
  Options,
  SlashCommandContext,
  StringOption,
  Subcommand,
} from 'necord';
import { QueryFailedError } from 'typeorm';
import { groupBy } from 'lodash';
import { Attachment, Client, PermissionsBitField } from 'discord.js';
import { AuthError, ValidationError } from 'src/errors';
import { ErrorEmbed, SuccessEmbed } from 'src/bot/embed';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { DeltaCommand } from 'src/inventory/inventory.command-group';
import { PoiSelectAutocompleteInterceptor } from 'src/game/poi/poi-select.interceptor';
import { GuildService } from 'src/core/guild/guild.service';
import { BotService } from 'src/bot/bot.service';
import { AccessDecision } from 'src/core/access/access-decision';
import { AccessService } from 'src/core/access/access.service';
import { StockpileService } from './stockpile.service';
import { SelectStockpileLog } from './stockpile-log.entity';
import { StockpileUpdateAutocompleteInterceptor } from './stockpile-update.interceptor';
import { StockpileSearchAutocompleteInterceptor } from './stockpile-search.interceptor';
import { StockpileContentPromptBuilder } from './stockpile-content.prompt';
import { StockpileGrantAccessAutocompleteInterceptor } from './stockpile-grant-access.interceptor';

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

export class SearchStockpileCommandParams {
  @StringOption({
    name: 'stockpile',
    description: 'Select a stockpile',
    autocomplete: true,
    required: false,
  })
  stockpileId: string;

  @StringOption({
    name: 'location',
    description: 'Select a location',
    autocomplete: true,
    required: false,
  })
  locationId: string;

  @StringOption({
    name: 'catalog',
    description: 'Select an item',
    autocomplete: true,
    required: false,
  })
  catalogId: string;
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
  crew: string;
}

export class GrantStockpileAccessCommandParams {
  @StringOption({
    name: 'stockpile',
    description: 'Select a stockpile',
    autocomplete: true,
    required: true,
  })
  stockpileId: string;

  @StringOption({
    name: 'rule',
    description: 'Select a rule',
    autocomplete: true,
    required: true,
  })
  ruleId: string;
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
    private readonly client: Client,
    private readonly guildService: GuildService,
    private readonly botService: BotService,
    private readonly stockpileService: StockpileService,
    private readonly accessService: AccessService,
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
    const guild = await this.guildService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .getOneOrFail();

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
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

  @UseInterceptors(StockpileUpdateAutocompleteInterceptor)
  @Subcommand({
    name: 'log',
    description: 'Update stockpile contents',
    dmPermission: false,
  })
  async onLogStockpile(
    @Context() [interaction]: SlashCommandContext,
    @Options() { reportAttachment, crew, locationId, message }: StockpileLogCommandParams,
  ) {
    const channelRef = crew || interaction.channelId;
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const guild = await this.guildService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .getOneOrFail();

    const report = await fetch(reportAttachment.url);
    const raw = await report.text();

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError('FORBIDDEN', 'Not allowed to update stockpiles').asDisplayable();
    }

    const result = await this.stockpileService.registerLog({
      crewSf: channelRef,
      createdBy: memberRef,
      guildId: guild.id,
      locationId,
      message,
      raw,
    });

    if (result.identifiers.length) {
      const [{ id }] = result.identifiers as SelectStockpileLog[];

      await this.botService.publish(interaction, 'stockpile', 'log.process', {
        id,
      });
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Stockpile update scheduled')],
    });
  }

  @UseInterceptors(StockpileSearchAutocompleteInterceptor)
  @Subcommand({
    name: 'search',
    description: 'Search stockpile contents',
    dmPermission: false,
  })
  async onSearchStockpile(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: SearchStockpileCommandParams,
  ) {
    const accessArgs = await this.accessService.getTestArgs(interaction);
    const stockpiles = await this.stockpileService
      .query()
      .withGuild()
      .byGuild({ guildSf: interaction.guildId })
      .withAccessRules()
      .getMany();
    const accessibleStockpiles = stockpiles.filter((stockpile) =>
      stockpile.access.some((access) =>
        AccessDecision.fromEntry(access.rule).permit(...accessArgs),
      ),
    );

    if (!accessibleStockpiles.length) {
      return this.botService.replyOrFollowUp(interaction, {
        embeds: [new ErrorEmbed('ERROR_GENERIC').setTitle('None')],
      });
    }

    const query = await this.stockpileService
      .queryEntries()
      .byStockpile(accessibleStockpiles)
      .withGuild()
      .withCatalog()
      .withLog()
      .withPoi()
      .withStockpile()
      .withoutNilEntries()
      .forDefaultCatalog()
      .byGuild({ guildSf: interaction.guildId });

    if (options.catalogId) {
      query.byCatalog({ id: options.catalogId });
    }

    if (options.locationId) {
      query.byLocation({ id: options.locationId });
    }

    if (options.stockpileId) {
      query.byStockpile({ id: options.stockpileId });
    }

    const entries = await query.order().getMany();
    const groups = groupBy(entries, (e) => e.expandedCatalog.category);

    const prompt = new StockpileContentPromptBuilder(await this.client.application.emojis.fetch());

    for (const [group, entries] of Object.entries(groups)) {
      prompt.displayFields(entries, {
        title: group
          .split('::')
          .pop()
          .replace(/([a-z])([A-Z])/g, '$1 $2'),
      });
    }

    if (!prompt.length) {
      return this.botService.replyOrFollowUp(interaction, {
        embeds: [new ErrorEmbed('ERROR_GENERIC').setTitle('None')],
      });
    }

    return this.botService.replyOrFollowUp(interaction, prompt.build());
  }

  @UseInterceptors(StockpileGrantAccessAutocompleteInterceptor)
  @Subcommand({
    name: 'grant',
    description: 'Grant access to stockpile. Guild admin only',
    dmPermission: false,
  })
  async onGrantStockpileAccess(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: GrantStockpileAccessCommandParams,
  ) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError('FORBIDDEN', 'Only guild admins can use this command').asDisplayable();
    }

    const stockpile = await this.stockpileService
      .query()
      .withGuild()
      .byGuild({ guildSf: interaction.guildId })
      .byStockpile({ id: options.stockpileId })
      .getOneOrFail();

    if (!stockpile) {
      throw new ValidationError('VALIDATION_FAILED', `Unable to access stockpile`).asDisplayable();
    }

    const rule = await this.accessService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byEntry({ id: options.ruleId })
      .getOneOrFail();

    if (!rule) {
      throw new ValidationError('NOT_FOUND', 'Rule does not exist').asDisplayable();
    }

    try {
      await this.stockpileService.grantAccess({
        stockpileId: options.stockpileId,
        ruleId: options.ruleId,
        createdBy: interaction.user.id,
      });
    } catch (err) {
      if (err instanceof QueryFailedError && err.driverError.code === '23505') {
        throw new ValidationError(
          'VALIDATION_FAILED',
          `Rule '${rule.description}' already exists for ${stockpile.name}`,
          [err],
        ).asDisplayable();
      }
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Access granted')],
    });
  }
}
