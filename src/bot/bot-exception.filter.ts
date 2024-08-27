import { ExceptionFilter, Catch, Logger, Inject } from '@nestjs/common';
import { NecordArgumentsHost, NecordBaseDiscovery, NecordContextType } from 'necord';
import { DisplayError, DisplayErrorKey, ErrorBase, InternalError } from 'src/errors';
import { BotService } from './bot.service';

@Catch()
export class DiscordExceptionFilter
  implements ExceptionFilter<ErrorBase | DisplayError<DisplayErrorKey>>
{
  private readonly logger = new Logger(DiscordExceptionFilter.name);

  @Inject()
  private readonly botService: BotService;

  async catch(
    exception: ErrorBase | DisplayError<DisplayErrorKey>,
    host: NecordArgumentsHost,
  ): Promise<void> {
    if (host.getType<NecordContextType>() !== 'necord') {
      this.logger.error(
        'Filter can only be used for Discord command handlers',
        new Error(`Expected context 'necord', got context '${host.getType()}'`).stack,
      );
      throw exception;
    }

    const pickCause = exception.cause?.stack ?? exception.cause ?? exception.stack;
    const cause = typeof pickCause === 'string' ? pickCause : JSON.stringify(pickCause);
    this.logger.error(exception, cause);

    const discovery: NecordBaseDiscovery<any> = host.getArgByIndex(1);

    if (!discovery.isContextMenu() && !discovery.isSlashCommand()) {
      const err = new Error(`Interaction is not a discord command`);
      return this.logger.error(err, err.stack);
    }

    const displayable: DisplayError<DisplayErrorKey> =
      exception instanceof DisplayError
        ? exception
        : new InternalError('INTERNAL_SERVER_ERROR', exception);

    await this.botService.reportCommandError(host.getArgByIndex(0), {
      code: displayable.name,
      message: displayable.message,
      cause,
    });
  }
}
