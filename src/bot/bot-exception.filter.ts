import { ExceptionFilter, Catch, Logger } from '@nestjs/common';
import { NecordArgumentsHost, NecordBaseDiscovery, NecordContextType } from 'necord';
import { ApiError, DiscordEmbeddableError, ErrorBase, InternalError } from '../errors';
import { CommandInteraction } from 'discord.js';

@Catch()
export class DiscordExceptionFilter implements ExceptionFilter<ErrorBase> {
  private readonly logger = new Logger(DiscordExceptionFilter.name);

  async catch(exception: DiscordEmbeddableError, host: NecordArgumentsHost): Promise<void> {
    if (!(exception instanceof DiscordEmbeddableError)) {
      exception = new InternalError('INTERNAL_SERVER_ERROR', exception);
    }

    if (host.getType<NecordContextType>() !== 'necord') {
      this.logger.error(
        'Filter can only be used for Discord command handlers',
        new Error(`Expected context 'necord', got context '${host.getType()}'`).stack,
      );
      throw exception;
    }

    if (exception instanceof InternalError) {
      this.logger.error(exception, exception.cause?.stack ?? exception.stack);
    } else {
      this.logger.warn(exception);
    }

    const discovery: NecordBaseDiscovery<any> = host.getArgByIndex(1);

    if (!discovery.isContextMenu() && !discovery.isSlashCommand()) {
      const err = new Error(`Interaction is not a discord command`);
      return this.logger.error(err, err.stack);
    }

    const [interaction]: [CommandInteraction] = host.getArgByIndex(0);

    try {
      interaction.replied || interaction.deferred
        ? await interaction.followUp({ embeds: [exception.toEmbed()], ephemeral: true })
        : await interaction.reply({ embeds: [exception.toEmbed()], ephemeral: true });
    } catch (err) {
      this.logger.error(new ApiError('DISCORD'), err.stack);
    }
  }
}
