import { Injectable, Logger, UseFilters } from '@nestjs/common';
import { PermissionsBitField } from 'discord.js';
import { Context, SlashCommandContext, Subcommand } from 'necord';
import { AuthError } from 'src/errors';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { BotService } from 'src/bot/bot.service';
import { EchoCommand } from 'src/core/echo.command-group';
import { SuccessEmbed } from 'src/bot/embed';
import { ApiService } from './api.service';

@Injectable()
@EchoCommand({
  name: 'api',
  description: 'Manage API interaction',
})
@UseFilters(DiscordExceptionFilter)
export class ApiCommand {
  private readonly logger = new Logger(ApiCommand.name);

  constructor(
    private readonly botService: BotService,
    private readonly apiService: ApiService,
  ) {}

  @Subcommand({
    name: 'new_key',
    description: 'Create a new API',
    dmPermission: false,
  })
  async onNewApiKey(@Context() [interaction]: SlashCommandContext) {
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      throw new AuthError(
        'FORBIDDEN',
        'Only a guild administrator can perform this action',
      ).asDisplayable();
    }

    const key = await this.apiService.makeApiKey({
      aud: interaction.guildId,
      sub: interaction.member?.user?.id ?? interaction.user?.id,
      iat: Date.now(),
    });

    await this.botService.replyOrFollowUp(interaction, {
      embeds: [
        new SuccessEmbed('SUCCESS_GENERIC')
          .setTitle('New API Key')
          .setDescription(
            `Copy this API key and store it in a secure location. You will not be able to recover this key. If you lose it then create a new one.\n\nAPI Key: ||\`${key}\`||`,
          ),
      ],
    });
  }
}
