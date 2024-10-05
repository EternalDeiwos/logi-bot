import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { TeamService } from './team.service';

@Injectable()
export class TeamSelectAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(TeamSelectAutocompleteInterceptor.name);

  @Inject()
  private readonly teamService: TeamService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'team') {
      const results = await this.teamService
        .query()
        .byGuild({ guildSf: interaction.guildId })
        .search(focused.value.toString())
        .getMany();
      return interaction.respond(
        results.map((result) => ({ name: result.name, value: result.id })),
      );
    }
  }
}
