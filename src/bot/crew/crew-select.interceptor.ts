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
      const results = await this.crewService.searchCrew(
        interaction.guild,
        focused.value.toString(),
      );
      return interaction.respond(
        results.map((result) => {
          const teamName =
            result.parent.guild !== interaction.guildId
              ? `[${result.parent.shortName}] ${result.team.name}`
              : result.team.name;
          return {
            name: `${teamName}: ${result.name}`,
            value: result.channel,
          };
        }),
      );
    }
  }
}
