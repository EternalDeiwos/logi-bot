import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { CrewSettingName } from './crew-setting.entity';
import { CrewService } from './crew.service';

@Injectable()
export class CrewSettingAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(CrewSettingAutocompleteInterceptor.name);

  @Inject()
  private readonly crewService: CrewService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    const regex = new RegExp(focused.value.replaceAll('.', '\\.'), 'gi');

    if (focused.name === 'setting') {
      return interaction.respond(
        Object.values(CrewSettingName)
          .filter((setting) => regex.test(focused.value.toLowerCase()))
          .map((result) => {
            return {
              name: result,
              value: result,
            };
          }),
      );
    }

    if (focused.name === 'crew') {
      const results = await this.crewService
        .query()
        .withTeam()
        .searchByGuild({ guildSf: interaction.guildId }, focused.value.toString())
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
  }
}
