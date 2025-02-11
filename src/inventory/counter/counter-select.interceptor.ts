import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { AccessDecisionBuilder } from 'src/core/access/access-decision.builder';
import { AccessService } from 'src/core/access/access.service';
import { CrewService } from 'src/core/crew/crew.service';
import { CounterService } from './counter.service';
import { CounterKind } from './counter.entity';

@Injectable()
export class CounterSelectAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(CounterSelectAutocompleteInterceptor.name);

  @Inject()
  private readonly crewService: CrewService;

  @Inject()
  private readonly counterService: CounterService;

  @Inject()
  private readonly accessService: AccessService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'counter') {
      const results = await this.counterService
        .query()
        .withGuild()
        .withCrew()
        .forCurrentWar()
        .byGuild({ guildSf: interaction.guildId })
        .search(focused.value.toString())
        .getMany();

      const accessArgs = await this.accessService.getTestArgs(interaction);
      const accessibleCounters = results.filter((counter) =>
        new AccessDecisionBuilder()
          .addRule({ crew: { id: counter.crewId } })
          .addRule({ guildAdmin: true })
          .build()
          .permit(...accessArgs),
      );

      return interaction.respond(
        accessibleCounters.map((result) => {
          const counterName = [`${result.crew.name}: ${result.name}`];

          if (result.kind !== CounterKind.SIMPLE) {
            counterName.push(`(${result.kind})`);
          }

          return {
            name: counterName.join(' '),
            value: result.id,
          };
        }),
      );
    }
  }
}
