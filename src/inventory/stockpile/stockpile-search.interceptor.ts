import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { PoiService } from 'src/game/poi/poi.service';
import { AccessDecision } from 'src/core/access/access-decision';
import { AccessService } from 'src/core/access/access.service';
import { StockpileService } from './stockpile.service';

@Injectable()
export class StockpileSearchAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(StockpileSearchAutocompleteInterceptor.name);

  @Inject()
  private readonly poiService: PoiService;

  @Inject()
  private readonly stockpileService: StockpileService;

  @Inject()
  private readonly accessService: AccessService;

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
      const query = await this.stockpileService
        .queryEntries()
        .withLog()
        .withCatalog()
        .forDefaultCatalog()
        .withPoi()
        .withStockpile();
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
            name: result.expandedCatalog.displayName,
            value: result.catalogId,
          };
        }),
      );
    }

    if (focused.name === 'stockpile') {
      const accessArgs = await this.accessService.getTestArgs(interaction);
      const query = await this.stockpileService
        .query()
        .forCurrentWar()
        .withPoi()
        .withGuild()
        .withAccessRules()
        .byGuild({ guildSf: interaction.guildId });

      const locationId = interaction.options.getString('location', false);
      const catalogId = interaction.options.getString('catalog', false);

      if (locationId) {
        query.byLocation({ id: locationId });
      }

      if (catalogId) {
        query.withCurrentEntries().byContents({ id: catalogId });
      }

      const results = await query.search(focused.value.toString()).order().limit(25).getMany();
      return interaction.respond(
        results
          .filter((item) =>
            item.access.some((access) =>
              AccessDecision.fromEntry(access.rule).permit(...accessArgs),
            ),
          )
          .map((result) => {
            return {
              name: `${result.expandedLocation.getName()}: ${result.name}`,
              value: result.id,
            };
          }),
      );
    }
  }
}
