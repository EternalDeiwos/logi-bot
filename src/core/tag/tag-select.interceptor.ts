import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { TagService } from './tag.service';

@Injectable()
export class TagSelectAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(TagSelectAutocompleteInterceptor.name);

  @Inject()
  private readonly templateService: TagService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'tag') {
      const results = await this.templateService
        .queryTemplate()
        .byGuild({ guildSf: interaction.guildId })
        .search(focused.value.toString())
        .getMany();
      return interaction.respond(
        results.map((result) => ({ name: result.name, value: result.id })),
      );
    }
  }
}
