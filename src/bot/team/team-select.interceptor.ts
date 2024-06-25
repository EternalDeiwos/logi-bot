import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { TeamRepository } from './team.repository';

@Injectable()
export class TeamSelectAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(TeamSelectAutocompleteInterceptor.name);

  @Inject()
  private readonly teamRepo: TeamRepository;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'team') {
      const results = await this.teamRepo
        .search(interaction.guildId, focused.value.toString())
        .getMany();
      return interaction.respond(
        results.map((result) => ({ name: result.name, value: result.category })),
      );
    }
  }
}
