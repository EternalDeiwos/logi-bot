import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { GuildService } from 'src/bot/guild/guild.service';
import { CrewService } from './crew.service';

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
      const results = await this.crewService.searchCrew(
        interaction.guild,
        focused.value.toString(),
        false,
      );
      return interaction.respond(
        results.map((result) => ({
          name: `${result.team.name}: ${result.name}`,
          value: result.channel,
        })),
      );
    }

    if (focused.name === 'guild') {
      const results = await this.guildService.searchGuild(
        focused.value.toString(),
        // interaction.guildId,
      );
      return interaction.respond(
        results.map((result) => ({
          name: result.name,
          value: result.guild,
        })),
      );
    }
  }
}
