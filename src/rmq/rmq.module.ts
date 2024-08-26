import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessageHandlerErrorBehavior, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { RetryConsumer } from './retry.consumer';
import { ErrorTraceConsumer } from './error.consumer';

@Module({
  imports: [
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const user = configService.getOrThrow<string>('RABBITMQ_DEFAULT_USER');
        const pass = configService.getOrThrow<string>('RABBITMQ_DEFAULT_PASS');
        const host = configService.getOrThrow<string>('RABBITMQ_HOST');
        const port = configService.getOrThrow<number>('RABBITMQ_PORT');
        const retryBase = configService.getOrThrow<number>('APP_QUEUE_RETRY_BACKOFF_BASE');
        const retryMul = configService.getOrThrow<number>('APP_QUEUE_RETRY_BACKOFF_MULTIPLIER');
        const retryMax = configService.getOrThrow<number>('APP_QUEUE_MAX_RETRY_COUNT');

        return {
          exchanges: [
            {
              name: 'discord',
            },
            {
              name: 'retry',
            },
            {
              name: 'errors',
            },
          ],
          queues: [
            {
              name: 'error-handling-main',
              exchange: 'errors',
              routingKey: '#',
              options: {
                durable: true,
                maxLength: 1e4,
              },
            },
          ],
          uri: `amqp://${user}:${pass}@${host}:${port}`,
          connectionInitOptions: { wait: true },
          logger: RMQModule.logger,
          defaultExchangeType: 'topic',
          defaultRpcTimeout: retryMul * Math.pow(retryBase, retryMax),
          defaultSubscribeErrorBehavior: MessageHandlerErrorBehavior.NACK,
          defaultRpcErrorHandler: async (channel, msg, error) => {
            const { replyTo, correlationId, expiration, headers } = msg.properties;
            const { ['x-retry-count']: retryCount = 0 } = headers;

            if (retryCount >= retryMax) {
              const pickCause = error.cause?.stack ?? error.cause ?? error.stack;
              const cause = typeof pickCause === 'string' ? pickCause : JSON.stringify(pickCause);
              await channel.publish(
                '',
                replyTo,
                Buffer.from(
                  JSON.stringify({
                    error: {
                      code: error.name,
                      message: error.message,
                      cause,
                    },
                  }),
                ),
                { correlationId, expiration, headers },
              );
            }
            channel.nack(msg, false, false);
          },
        };
      },
    }),
  ],
  providers: [RetryConsumer, ErrorTraceConsumer],
  exports: [RabbitMQModule],
})
export class RMQModule {
  private static logger = new Logger(RMQModule.name, { timestamp: true });
}
