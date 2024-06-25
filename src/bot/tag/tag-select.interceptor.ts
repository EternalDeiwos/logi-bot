import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { TagTemplateRepository } from './tag-template.repository';

@Injectable()
export class TagSelectAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(TagSelectAutocompleteInterceptor.name);

  @Inject()
  private readonly templateRepo: TagTemplateRepository;

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'tag') {
      const results = await this.templateRepo
        .search(interaction.guildId, focused.value.toString())
        .getMany();
      return interaction.respond(
        results.map((result) => ({ name: result.name, value: result.id })),
      );
    }
  }
}
