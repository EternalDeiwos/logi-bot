import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { CrewService } from 'src/core/crew/crew.service';
import { CatalogService } from 'src/game/catalog/catalog.service';
import { CounterKind } from './counter.entity';

@Injectable()
export class CounterCreateAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(CounterCreateAutocompleteInterceptor.name);

  @Inject()
  private readonly crewService: CrewService;

  @Inject()
  private readonly catalogService: CatalogService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'kind') {
      return interaction.respond(
        Object.values(CounterKind)
          .filter((v) => v.toLowerCase().includes(focused.value.toLowerCase()))
          .map((v) => ({ name: v, value: v })),
      );
    }

    if (focused.name === 'crew') {
      const results = await this.crewService
        .query()
        .withTeam()
        .searchByGuildWithShared({ guildSf: interaction.guildId }, focused.value.toString())
        .getMany();
      return interaction.respond(
        results.map((result) => {
          const teamName =
            result.guild.guildSf !== interaction.guildId
              ? `[${result.guild.shortName}] ${result.team.name}`
              : result.team.name;
          return {
            name: `${teamName}: ${result.name}`,
            value: result.crewSf,
          };
        }),
      );
    }

    if (focused.name === 'catalog') {
      const results = await this.catalogService
        .query()
        .search(focused.value.toString())
        .limit(25)
        .getMany();
      return interaction.respond(
        results.map((result) => ({
          name: result.displayName,
          value: result.id,
        })),
      );
    }
  }
}
