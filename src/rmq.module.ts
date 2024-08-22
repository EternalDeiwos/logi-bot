import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

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

        return {
          exchanges: [
            {
              name: 'discord',
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
            },
          ],
          uri: `amqp://${user}:${pass}@${host}:${port}`,
          connectionInitOptions: { wait: true },
          defaultExchangeType: 'topic',
        };
      },
    }),
  ],
  providers: [],
  exports: [RabbitMQModule],
})
export class RMQModule {}
