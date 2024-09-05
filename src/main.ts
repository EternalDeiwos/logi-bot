import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ServerModule } from './app.module';
import { ConfigKey } from './app.config';

async function bootstrap() {
  const app = await NestFactory.create(ServerModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['fatal', 'error', 'warn', 'log']
        : ['fatal', 'error', 'warn', 'log', 'debug'],
  });
  const configService = app.get(ConfigService<Record<ConfigKey, unknown>>);
  const port = configService.getOrThrow('APP_PORT');
  await app.listen(port);
}
bootstrap();
