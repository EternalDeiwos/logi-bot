import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Config, ConfigService } from './config';

async function bootstrap() {
  if (!process.env['NODE_ENV']) {
    process.env['NODE_ENV'] = 'production';
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>(Config.APP_PORT);
  await app.listen(port);
}
bootstrap();
