import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection, Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import { ConfigKey } from 'src/app.config';

@Injectable()
export class RetryConsumer {
  private readonly logger = new Logger(RetryConsumer.name);

  constructor(
    private readonly configService: ConfigService<Record<ConfigKey, unknown>>,
    private readonly rmq: AmqpConnection,
  ) {}

  @RabbitSubscribe({
    exchange: 'retry',
    routingKey: '#',
    queue: 'retry-triage',
    queueOptions: {
      deadLetterExchange: 'errors',
    },
  })
  public async retryTriage(payload: any, msg: ConsumeMessage) {
    const { routingKey: originalRoutingKey } = msg.fields;
    const { headers, correlationId, replyTo } = msg.properties;
    let { ['x-first-death-exchange']: exchange, ['x-retry-count']: retryCount = 0 } = headers;

    const base = this.configService.getOrThrow<number>('APP_QUEUE_RETRY_BACKOFF_BASE');
    const multiplier = this.configService.getOrThrow<number>('APP_QUEUE_RETRY_BACKOFF_MULTIPLIER');
    const maxRetry = this.configService.getOrThrow<number>('APP_QUEUE_MAX_RETRY_COUNT');
    const expiration = multiplier * Math.pow(base, retryCount++);
    if (!exchange || retryCount > maxRetry) {
      return new Nack();
    }

    const queue = `${exchange}-${originalRoutingKey}-wait-${retryCount}`;
    await this.rmq.channel.assertQueue(queue, {
      deadLetterExchange: exchange,
      deadLetterRoutingKey: originalRoutingKey,
      expires: expiration * base,
    });

    this.logger.debug(
      `Retrying ${exchange}/${originalRoutingKey}(${correlationId}) #${retryCount}`,
    );

    const result = await this.rmq.publish('', queue, payload, {
      expiration,
      correlationId,
      replyTo,
      headers: {
        ...headers,
        ['x-retry-count']: retryCount,
      },
    });

    if (!result) {
      throw new Error('Failed to republish message');
    }
  }
}
