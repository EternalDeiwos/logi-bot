import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { AccessService } from 'src/core/access/access.service';
import { AccessMode } from 'src/types';
import { CrewAction } from './crew-access.entity';
import { CrewService } from './crew.service';

@Injectable()
export class CrewGrantAccessAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(CrewGrantAccessAutocompleteInterceptor.name);

  @Inject()
  private readonly accessService: AccessService;

  @Inject()
  private readonly crewService: CrewService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'rule') {
      const results = await this.accessService
        .query()
        .byGuild({ guildSf: interaction.guildId })
        .search(focused.value.toString())
        .limit(25)
        .getMany();

      return interaction.respond(
        results.map((result) => {
          return {
            name: result.description,
            value: result.id,
          };
        }),
      );
    }

    if (focused.name === 'access') {
      return interaction.respond(
        Object.keys(AccessMode)
          .filter((k) => k.toLowerCase().includes(focused.value.toLowerCase()))
          .map((name) => ({
            name,
            value: name,
          })),
      );
    }

    if (focused.name === 'action') {
      return interaction.respond(
        Object.keys(CrewAction)
          .filter((k) => k.toLowerCase().includes(focused.value.toLowerCase()))
          .map((name) => ({
            name,
            value: name,
          })),
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
  }
}
