import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { CrewService } from './crew.service';

@Injectable()
export class CrewSelectAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(CrewSelectAutocompleteInterceptor.name);

  @Inject()
  private readonly crewService: CrewService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'crew') {
      const results = await this.crewService.search(
        { guildSf: interaction.guildId },
        focused.value.toString(),
        true,
      );
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
  }
}
