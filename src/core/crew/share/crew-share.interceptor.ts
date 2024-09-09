import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { GuildService } from 'src/core/guild/guild.service';
import { CrewRepository } from 'src/core/crew/crew.repository';

@Injectable()
export class CrewShareAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(CrewShareAutocompleteInterceptor.name);

  @Inject()
  private readonly crewRepo: CrewRepository;

  @Inject()
  private readonly guildService: GuildService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'crew') {
      const results = await this.crewRepo
        .search(interaction.guildId, focused.value.toString(), false)
        .getMany();
      return interaction.respond(
        results.map((result) => ({
          name: `${result.team.name}: ${result.name}`,
          value: result.crewSf,
        })),
      );
    }

    if (focused.name === 'guild') {
      const results = await this.guildService.searchGuild(
        focused.value.toString(),
        interaction.guildId,
      );
      return interaction.respond(
        results.map((result) => ({
          name: result.name,
          value: result.id,
        })),
      );
    }
  }
}
