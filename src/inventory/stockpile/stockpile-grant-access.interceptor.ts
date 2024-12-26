import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { AccessService } from 'src/core/access/access.service';
import { StockpileService } from './stockpile.service';

@Injectable()
export class StockpileGrantAccessAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(StockpileGrantAccessAutocompleteInterceptor.name);

  @Inject()
  private readonly accessService: AccessService;

  @Inject()
  private readonly stockpileService: StockpileService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'rule') {
      const results = await this.accessService
        .query()
        .byGuild({ guildSf: interaction.guildId })
        .search(focused.value.toString())
        .limit(25)
        .getMany();

      return interaction.respond(
        results.map((result) => {
          return {
            name: result.description,
            value: result.id,
          };
        }),
      );
    }

    if (focused.name === 'stockpile') {
      const results = await this.stockpileService
        .query()
        .forCurrentWar()
        .withPoi()
        .withGuild()
        .byGuild({ guildSf: interaction.guildId })
        .search(focused.value.toString())
        .order()
        .limit(25)
        .getMany();

      return interaction.respond(
        results.map((result) => {
          return {
            name: `${result.expandedLocation.getName()}: ${result.name}`,
            value: result.id,
          };
        }),
      );
    }
  }
}
