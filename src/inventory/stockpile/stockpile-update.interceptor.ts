import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { CrewService } from 'src/core/crew/crew.service';
import { PoiService } from 'src/game/poi/poi.service';

@Injectable()
export class StockpileUpdateAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(StockpileUpdateAutocompleteInterceptor.name);

  @Inject()
  private readonly crewService: CrewService;

  @Inject()
  private readonly poiService: PoiService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'location') {
      const results = await this.poiService
        .query()
        .withStockpiles()
        .search(focused.value.toString())
        .getMany();

      return interaction.respond(
        results
          .map((result) => {
            return {
              name: result.getName(),
              value: result.id,
            };
          })
          .slice(0, 25),
      );
    }

    if (focused.name === 'crew') {
      const results = await this.crewService
        .query()
        .withTeam()
        .searchByGuild({ guildSf: interaction.guildId }, focused.value.toString())
        .getMany();
      return interaction.respond(
        results.map((result) => {
          return {
            name: `${result.team.name}: ${result.name}`,
            value: result.crewSf,
          };
        }),
      );
    }
  }
}
