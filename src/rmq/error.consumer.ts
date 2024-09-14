import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';

@Injectable()
export class ErrorTraceConsumer {
  private readonly logger = new Logger(ErrorTraceConsumer.name);

  @RabbitSubscribe({
    exchange: 'errors',
    routingKey: '#',
    queue: 'error-trace',
  })
  public async traceError(_: any, msg: ConsumeMessage) {
    const { content, ...metadata } = msg;
    const { routingKey: originalRoutingKey } = msg.fields;
    const { headers, correlationId } = msg.properties;
    const { ['x-first-death-exchange']: exchange, ['x-retry-count']: retryCount = 0 } = headers;

    this.logger.debug(
      `Failed to process ${exchange}/${originalRoutingKey}(${correlationId}) after ${retryCount} retries`,
      JSON.stringify(metadata),
    );
  }
}
