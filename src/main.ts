import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ServerModule } from './app.module';
import { ConfigKey } from './app.config';

import * as pkg from '../package.json';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(ServerModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['fatal', 'error', 'warn', 'log']
        : ['fatal', 'error', 'warn', 'log', 'debug'],
  });
  const configService = app.get(ConfigService<Record<ConfigKey, unknown>>);
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Logi Bot')
    .setDescription(pkg.description)
    .setVersion(process.env.NODE_ENV === 'production' ? pkg.version : 'unstable')
    .addBearerAuth()
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDoc);

  const port = configService.getOrThrow('APP_PORT');
  await app.listen(port);
}
bootstrap();
