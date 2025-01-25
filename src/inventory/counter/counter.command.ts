import { Injectable, Logger, UseFilters, UseInterceptors } from '@nestjs/common';
import {
  Button,
  ButtonContext,
  ComponentParam,
  Context,
  Modal,
  ModalContext,
  Options,
  SlashCommandContext,
  StringOption,
  Subcommand,
} from 'necord';
import { CommandInteraction, inlineCode, MessageComponentInteraction } from 'discord.js';
import { AuthError, ValidationError } from 'src/errors';
import { CrewMemberAccess } from 'src/types';
import { ErrorEmbed, SuccessEmbed } from 'src/bot/embed';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { DeltaCommand } from 'src/inventory/inventory.command-group';
import { BotService } from 'src/bot/bot.service';
import { CrewService } from 'src/core/crew/crew.service';
import { AccessDecision } from 'src/core/access/access-decision';
import { AccessService } from 'src/core/access/access.service';
import { AccessRuleType } from 'src/core/access/access.entity';
import { AccessRuleMode } from 'src/core/access/access-rule';
import { SelectCrewCommandParams } from 'src/core/crew/crew.command';
import { CrewSelectAutocompleteInterceptor } from 'src/core/crew/crew-select.interceptor';
import { CounterCreateAutocompleteInterceptor } from './counter-create.interceptor';
import { InsertCounterEntryDto } from './dto/insert-counter-entry.dto';
import { SelectCounterAccess } from './counter-access.entity';
import { CounterUpdateModalBuilder } from './ui/counter-update.modal';
import { CounterKind, CurrentCounter } from './counter.entity';
import { CounterService } from './counter.service';
import { SelectCrew } from 'src/core/crew/crew.entity';

export class CreateCounterCommandParams {
  @StringOption({
    name: 'name',
    description: 'Name of the counter',
    autocomplete: false,
    required: true,
  })
  name: string;

  @StringOption({
    name: 'kind',
    description: 'Kind of counter',
    autocomplete: true,
    required: true,
  })
  kind: string;

  @StringOption({
    name: 'crew',
    description: 'Select a crew',
    autocomplete: true,
    required: false,
  })
  crew: string;

  @StringOption({
    name: 'catalog',
    description: 'Select an item',
    autocomplete: true,
    required: false,
  })
  catalogId: string;
}

@Injectable()
@DeltaCommand({
  name: 'counter',
  description: 'Manage counters',
})
@UseFilters(DiscordExceptionFilter)
export class CounterCommand {
  private readonly logger = new Logger(CounterCommand.name);

  constructor(
    private readonly botService: BotService,
    private readonly crewService: CrewService,
    private readonly accessService: AccessService,
    private readonly counterService: CounterService,
  ) {}

  @UseInterceptors(CounterCreateAutocompleteInterceptor)
  @Subcommand({
    name: 'create',
    description: 'Create a counter',
    dmPermission: false,
  })
  async onCreateCounter(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: CreateCounterCommandParams,
  ) {
    await interaction.deferReply({ ephemeral: true });

    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew({ crewSf: data.crew || interaction.channelId })
      .getOne();

    if (!crew) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Counter needs to belong to a crew',
      ).asDisplayable();
    }

    const count = await this.counterService.query().byCrew({ id: crew.id }).getCount();

    if (count > 4) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Maximum counters per crew (5)',
      ).asDisplayable();
    }

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      new AccessDecision(AccessRuleType.PERMIT, {
        mode: AccessRuleMode.ANY,
        spec: [
          {
            crew,
            crewRole: CrewMemberAccess.ADMIN,
          },
          {
            guildAdmin: true,
          },
        ],
      }).deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only crew administrators may create counters',
      ).asDisplayable();
    }

    const counter = await this.counterService.registerCounter({
      name: data.name?.trim(),
      kind: data.kind as CounterKind,
      guildId: crew.guild.id,
      crewId: crew.id,
      catalogId: data.catalogId,
      createdBy: memberRef,
    });

    if (counter?.identifiers) {
      const [{ id }] = counter.identifiers as SelectCounterAccess[];
      const rule = await this.crewService.getOrCreateDefaultCrewAccessRule(crew);
      await this.counterService.grantAccess({
        counterId: id,
        createdBy: memberRef,
        ruleId: rule.id,
      });
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Counter registered')],
    });
  }

  @UseInterceptors(CrewSelectAutocompleteInterceptor)
  @Subcommand({
    name: 'update',
    description: 'Update crew counters',
    dmPermission: false,
  })
  async onUpdateCounter(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: SelectCrewCommandParams,
  ) {
    const crewRef: SelectCrew = { crewSf: data.crew || interaction.channelId };
    return this.showCounterUpdateModal(interaction, crewRef);
  }

  private async showCounterUpdateModal(
    interaction: MessageComponentInteraction | CommandInteraction,
    crewRef: SelectCrew,
  ) {
    const crew = await this.crewService
      .query()
      .byGuild({ guildSf: interaction.guildId })
      .byCrew(crewRef)
      .getOne();

    if (!crew) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Select a crew whose counters to update',
      ).asDisplayable();
    }

    const accessArgs = await this.accessService.getTestArgs(interaction);

    if (
      new AccessDecision(AccessRuleType.PERMIT, {
        mode: AccessRuleMode.ANY,
        spec: [
          {
            crew,
            crewRole: CrewMemberAccess.ADMIN,
          },
          {
            guildAdmin: true,
          },
        ],
      }).deny(...accessArgs)
    ) {
      throw new AuthError(
        'FORBIDDEN',
        'Only crew administrators may create counters',
      ).asDisplayable();
    }

    const counters = await this.counterService
      .query()
      .byCrew({ id: crew.id })
      .withCatalog()
      .getMany();
    return interaction.showModal(new CounterUpdateModalBuilder().addForm(counters));
  }

  @Button('counter/update/:crewId')
  async onCounterUpdateButton(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('crewId') crewId?: string,
  ) {
    return this.showCounterUpdateModal(interaction, { id: crewId });
  }

  @Modal('counter/update')
  async onCounterUpdateModal(@Context() [interaction]: ModalContext) {
    const memberRef = interaction.member?.user?.id ?? interaction.user?.id;
    const fields = interaction.fields.fields.reduce(
      (acc, field) => {
        acc[field.customId] = field.value;
        return acc;
      },
      {} as Record<CurrentCounter['id'], string>,
    );

    const accessArgs = await this.accessService.getTestArgs(interaction);
    const counters = await this.counterService
      .query()
      .withAccessRules()
      .withCatalog()
      .byCounter(
        Object.keys(fields).map((id) => ({
          id,
        })),
      )
      .getMany();

    for (const counter of counters) {
      let passed = false;
      for (const access of counter.access) {
        if (AccessDecision.fromEntry(access.rule).permit(...accessArgs)) {
          passed = true;
          break;
        }
      }

      if (!passed && counter.access.length) {
        throw new AuthError('FORBIDDEN', 'No rules passed');
      }
    }

    const errors: string[] = [];
    const updates = counters.reduce((acc, counter) => {
      const value = parseInt(fields[counter.id]);
      if (!isNaN(value) && value >= 0) {
        if (value !== counter.value) {
          acc.push({ counterId: counter.id, value, createdBy: memberRef });
        }
      } else {
        errors.push(`Invalid number for ${counter.name} (${counter.kind}): ${value}`);
      }

      return acc;
    }, [] as InsertCounterEntryDto[]);

    await this.counterService.updateCounter(updates);
    await this.botService.publish(interaction, 'counter', 'counter.update', { updates });

    if (errors.length) {
      const embed = new ErrorEmbed('VALIDATION_FAILED')
        .setDescription('One or more counters had invalid inputs')
        .spliceFields(0, 0, {
          name: 'Errors',
          value: errors.map((e) => inlineCode(e)).join('\n'),
          inline: false,
        });

      if (updates.length) {
        embed.spliceFields(0, 0, {
          name: 'Partial Success',
          value: `At least ${updates.length} field${updates.length > 1 ? 's were' : ' was'} successfully updated`,
          inline: false,
        });
      }

      return await this.botService.replyOrFollowUp(interaction, {
        embeds: [embed],
      });
    }

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [new SuccessEmbed('SUCCESS_GENERIC').setTitle('Counters updated')],
    });
  }
}
