import { ExceptionFilter, Catch, Logger } from '@nestjs/common';
import { NecordArgumentsHost, NecordBaseDiscovery, NecordContextType } from 'necord';
import { ApiError, ErrorBase, InternalError } from '.';
import { CommandInteraction } from 'discord.js';

@Catch()
export class BotInteractionExceptionHandler implements ExceptionFilter<ErrorBase<any>> {
  private static logger = new Logger(BotInteractionExceptionHandler.name);

  async catch(exception: ErrorBase<any>, host: NecordArgumentsHost): Promise<void> {
    if (!(exception instanceof ErrorBase)) {
      exception = new InternalError('INTERNAL_SERVER_ERROR', exception);
    }

    if (host.getType<NecordContextType>() !== 'necord') {
      BotInteractionExceptionHandler.logger.error(
        'Filter can only be used for Discord command handlers',
        new Error(`Expected context 'necord', got context '${host.getType()}'`).stack,
      );
      throw exception;
    }

    const discovery: NecordBaseDiscovery<any> = host.getArgByIndex(1);

    if (exception instanceof InternalError) {
      BotInteractionExceptionHandler.logger.error(
        exception,
        exception.cause?.stack ?? exception.stack,
      );
    } else {
      BotInteractionExceptionHandler.logger.warn(exception);
    }

    if (!discovery.isContextMenu() && !discovery.isSlashCommand()) {
      const err = new Error(`Interaction is not a discord command`);
      return BotInteractionExceptionHandler.logger.error(err, err.stack);
    }

    const content = `\`${exception.name}\`: ${exception.message}`;
    const [interaction]: [CommandInteraction] = host.getArgByIndex(0);

    try {
      interaction.replied || interaction.deferred
        ? await interaction.followUp({ content, ephemeral: true })
        : await interaction.reply({ content, ephemeral: true });
    } catch (err) {
      BotInteractionExceptionHandler.logger.error(new ApiError('DISCORD'), err.stack);
    }
  }
}
