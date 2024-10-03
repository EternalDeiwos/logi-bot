import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { GuildService } from 'src/core/guild/guild.service';
import { CrewService } from 'src/core/crew/crew.service';

@Injectable()
export class CrewShareAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(CrewShareAutocompleteInterceptor.name);

  @Inject()
  private readonly crewService: CrewService;

  @Inject()
  private readonly guildService: GuildService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'crew') {
      const results = await this.crewService
        .query()
        .withTeam()
        .searchByGuild({ guildSf: interaction.guildId }, focused.value.toString())
        .getMany();
      return interaction.respond(
        results.map((result) => ({
          name: `${result.team.name}: ${result.name}`,
          value: result.crewSf,
        })),
      );
    }

    if (focused.name === 'guild') {
      const results = await this.guildService.search(focused.value.toString(), interaction.guildId);
      return interaction.respond(
        results.map((result) => ({
          name: result.name,
          value: result.id,
        })),
      );
    }
  }
}
