import { Injectable } from '@nestjs/common';
import { CommandInteraction } from 'discord.js';
import { ConsumerResponseError } from 'src/types';
import { ErrorEmbed } from './embed';
import { ApiError } from 'src/errors';

@Injectable()
export class BotService {
  async reportCommandError(interaction: [CommandInteraction], error: ConsumerResponseError);
  async reportCommandError(interaction: CommandInteraction, error: ConsumerResponseError);
  async reportCommandError(
    interaction: CommandInteraction | [CommandInteraction],
    error: ConsumerResponseError,
  ) {
    try {
      if (Array.isArray(interaction)) {
        interaction = interaction.pop();
      }

      const replyFnName = interaction.deferred || interaction.replied ? 'followUp' : 'reply';

      if (ErrorEmbed.codes.includes(error.code as any)) {
        const embed = new ErrorEmbed(error.code as any);
        if (error.message) {
          embed.setDescription(error.message);
        }

        if (error.code === 'TEST_ERROR') {
          embed.spliceFields(0, 0, {
            name: 'Test Data',
            value: `\`\`\`${error.cause}\`\`\``,
          });
        }

        return interaction[replyFnName]({
          embeds: [embed],
        });
      } else {
        return interaction[replyFnName]({
          embeds: [new ErrorEmbed('INTERNAL_SERVER_ERROR')],
        });
      }
    } catch (err) {
      throw new ApiError('DISCORD_ERROR', err.stack);
    }
  }
}
