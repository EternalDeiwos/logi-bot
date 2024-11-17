import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { PoiService } from './poi.service';

@Injectable()
export class PoiSelectAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(PoiSelectAutocompleteInterceptor.name);

  @Inject()
  private readonly poiService: PoiService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'location') {
      const results = await this.poiService
        .query()
        .onlyStorage()
        .search(focused.value.toString())
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
  }
}
