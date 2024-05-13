import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { TagService } from './tag.service';

@Injectable()
export class TagSelectAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(TagSelectAutocompleteInterceptor.name);

  @Inject()
  private readonly tagService: TagService;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'tag') {
      const results = await this.tagService.searchTemplates(
        interaction.guild,
        focused.value.toString(),
      );
      return interaction.respond(
        results.map((result) => ({ name: result.name, value: result.id })),
      );
    }
  }
}
