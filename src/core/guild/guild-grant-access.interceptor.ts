import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { AccessService } from 'src/core/access/access.service';
import { AccessMode } from 'src/types';
import { GuildAction } from './guild-access.entity';

@Injectable()
export class GuildGrantAccessAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(GuildGrantAccessAutocompleteInterceptor.name);

  @Inject()
  private readonly accessService: AccessService;

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
        Object.keys(GuildAction)
          .filter((k) => k.toLowerCase().includes(focused.value.toLowerCase()))
          .map((name) => ({
            name,
            value: name,
          })),
      );
    }
  }
}
