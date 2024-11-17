import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { CrewService } from 'src/core/crew/crew.service';
import { PoiService } from 'src/game/poi/poi.service';
import { StockpileService } from './stockpile.service';

@Injectable()
export class StockpileSearchAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(StockpileSearchAutocompleteInterceptor.name);

  @Inject()
  private readonly crewService: CrewService;

  @Inject()
  private readonly poiService: PoiService;

  @Inject()
  private readonly stockpileService: StockpileService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'location') {
      const results = await this.poiService
        .query()
        .withStockpiles()
        .search(focused.value.toString())
        .order()
        .limit(25)
        .getMany();

      return interaction.respond(
        results.map((result) => {
          return {
            name: result.getName(),
            value: result.id,
          };
        }),
      );
    }

    if (focused.name === 'catalog') {
      const query = await this.stockpileService.queryEntries().withLog().withCatalog();
      const locationId = interaction.options.getString('location', false);
      const stockpileId = interaction.options.getString('stockpile', false);

      if (locationId) {
        query.byLocation({ id: locationId });
      }

      if (stockpileId) {
        query.byStockpile({ id: stockpileId });
      }

      query.searchByCatalog(focused.value.toString()).distinctOnCatalog().order();

      const results = await query.limit(25).getMany();
      return interaction.respond(
        results.map((result) => {
          return {
            name: result.catalog.data.DisplayName,
            value: result.catalogId,
          };
        }),
      );
    }

    if (focused.name === 'stockpile') {
      const query = await this.stockpileService
        .query()
        .withPoi()
        .withRegion()
        .withGuild()
        .byGuild({ guildSf: interaction.guildId });
      const locationId = interaction.options.getString('location', false);
      const catalogId = interaction.options.getString('catalog', false);

      if (locationId) {
        query.byLocation({ id: locationId });
      }

      if (catalogId) {
        query.byContents({ id: catalogId });
      }

      const results = await query.search(focused.value.toString()).order().limit(25).getMany();
      return interaction.respond(
        results.map((result) => {
          return {
            name: `${result.location.getName()}: ${result.name}`,
            value: result.id,
          };
        }),
      );
    }
  }
}
