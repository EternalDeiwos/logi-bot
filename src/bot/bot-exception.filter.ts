import { ExceptionFilter, Catch, Logger, Inject, ArgumentsHost } from '@nestjs/common';
import { NecordArgumentsHost, NecordContextType } from 'necord';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { DiscordAPIError } from 'discord.js';
import { AuthError, BaseError, DatabaseError, ExternalError, ValidationError } from 'src/errors';
import { BotService, CommandInteraction } from './bot.service';

type CaughtErrors = Error | BaseError;

@Catch()
export class DiscordExceptionFilter implements ExceptionFilter<CaughtErrors> {
  private readonly logger = new Logger(DiscordExceptionFilter.name);

  @Inject()
  private readonly botService: BotService;

  async catch(exception: CaughtErrors, host: ArgumentsHost): Promise<void> {
    const necord = NecordArgumentsHost.create(host);
    if (necord.getType<NecordContextType>() !== 'necord') {
      this.logger.error(
        'Filter can only be used for Discord command handlers',
        new Error(`Expected context 'necord', got context '${necord.getType()}'`).stack,
      );
      throw exception;
    }

    let displayable: BaseError;

    if (exception instanceof DiscordAPIError) {
      displayable = await this.catchDiscord(exception, necord);
    } else if (exception instanceof QueryFailedError) {
      displayable = await this.catchQueryFailed(exception, necord);
    } else if (exception instanceof EntityNotFoundError) {
      displayable = await this.catchEntityNotFound(exception, necord);
    } else if (exception instanceof BaseError) {
      displayable = exception;
    } else {
      displayable = new BaseError('INTERNAL_SERVER_ERROR', 'Something failed', exception);
    }

    if (Array.isArray(displayable.cause)) {
      this.logger.error(`${displayable.name}: ${displayable.message}`);
      for (const err of displayable.cause) {
        if (err.cause) {
          this.logger.error(`${err.name}: ${err.message}`, err.cause);
        } else {
          this.logger.error(`${err.name || err.constructor.name}: ${err.message}`, err.stack);
        }
      }
    } else {
      this.logger.error(`${displayable.name}: ${displayable.message}`, displayable.cause);
    }

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

  async catchDiscord(exception: DiscordAPIError, host: NecordArgumentsHost): Promise<BaseError> {
    // 40061 = Tag name must be unique
    if ([40061].includes(exception.code as number)) {
      return new ValidationError('VALIDATION_FAILED', exception.message).asDisplayable();
    }

    // 50013 = Missing Permissions
    if ([50013].includes(exception.code as number)) {
      return new ExternalError('INSUFFICIENT_PRIVILEGES', 'Bot requires additional privileges');
    }

    return new ExternalError('DISCORD_API_ERROR', 'Unknown', exception);
  }

  async catchQueryFailed(
    exception: QueryFailedError,
    host: NecordArgumentsHost,
  ): Promise<BaseError> {
    this.logger.debug(JSON.stringify(exception));
    return new DatabaseError('QUERY_FAILED', (exception as any)?.detail, exception);
  }

  async catchEntityNotFound(
    exception: EntityNotFoundError,
    host: NecordArgumentsHost,
  ): Promise<BaseError> {
    this.logger.debug(JSON.stringify(exception));
    return new ValidationError('VALIDATION_FAILED', exception.message, [exception]);
  }
}
