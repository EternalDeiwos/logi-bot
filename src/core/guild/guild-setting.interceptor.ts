import { Injectable, Logger } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';
import { GuildSettingName } from './guild-setting.entity';

@Injectable()
export class GuildSettingAutocompleteInterceptor extends AutocompleteInterceptor {
  private readonly logger = new Logger(GuildSettingAutocompleteInterceptor.name);

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    const regex = new RegExp(focused.value.replaceAll('.', '\\.'), 'gi');

    if (focused.name === 'setting') {
      return interaction.respond(
        Object.values(GuildSettingName)
          .filter((setting) => regex.test(focused.value.toLowerCase()))
          .map((result) => {
            return {
              name: result,
              value: result,
            };
          }),
      );
    }
  }
}
