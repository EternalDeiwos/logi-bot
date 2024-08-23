import { ExceptionFilter, Catch, Logger, ArgumentsHost, ContextType } from '@nestjs/common';
import { Nack } from '@golevelup/nestjs-rabbitmq';
import { ErrorBase, InternalError } from '.';

@Catch()
export class RMQExceptionHandler implements ExceptionFilter<ErrorBase<any>> {
  private static logger = new Logger(RMQExceptionHandler.name);

  async catch(exception: ErrorBase<any>, host: ArgumentsHost): Promise<any> {
    if (!(exception instanceof ErrorBase)) {
      exception = new InternalError('INTERNAL_SERVER_ERROR', exception);
    }

    if (host.getType<ContextType | 'rmq'>() !== 'rmq') {
      RMQExceptionHandler.logger.error(
        'Filter can only be used for RMQ consumers',
        new Error(`Expected context 'rmq', got context '${host.getType()}'`).stack,
      );
      throw exception;
    }

    if (exception instanceof InternalError) {
      RMQExceptionHandler.logger.error(exception, exception.cause?.stack ?? exception.stack);
    } else {
      RMQExceptionHandler.logger.warn(exception);
    }

    return new Nack();
  }
}
