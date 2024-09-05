import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { CrewRepository } from './crew.repository';

@Injectable()
export class CrewSelectAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(CrewSelectAutocompleteInterceptor.name);

  @Inject()
  private readonly crewRepo: CrewRepository;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'crew') {
      const results = await this.crewRepo
        .search(interaction.guildId, focused.value.toString(), true)
        .getMany();
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
