import { ExceptionFilter, Catch, Logger, Inject, ArgumentsHost } from '@nestjs/common';
import { NecordArgumentsHost, NecordContextType } from 'necord';
import { BaseError } from 'src/errors';
import { BotService, CommandInteraction } from './bot.service';

@Catch()
export class DiscordExceptionFilter implements ExceptionFilter<Error | BaseError> {
  private readonly logger = new Logger(DiscordExceptionFilter.name);

  @Inject()
  private readonly botService: BotService;

  async catch(exception: Error | BaseError, host: ArgumentsHost): Promise<void> {
    const necord = NecordArgumentsHost.create(host);
    if (necord.getType<NecordContextType>() !== 'necord') {
      this.logger.error(
        'Filter can only be used for Discord command handlers',
        new Error(`Expected context 'necord', got context '${necord.getType()}'`).stack,
      );
      throw exception;
    }

    const displayable: BaseError =
      exception instanceof BaseError
        ? exception
        : new BaseError('INTERNAL_SERVER_ERROR', 'Something failed', exception);
    this.logger.error(exception, displayable.getCause());

    const discovery = necord.getDiscovery();

    if (discovery.isListener()) {
      const err = new Error(`Interaction is not a discord command`);
      return this.logger.error(err, err.stack);
    }

    await this.botService.reportCommandError(
      necord.getContext<[CommandInteraction]>(),
      displayable.toJSON(),
    );
  }
}
