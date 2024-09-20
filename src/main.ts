import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { default as helmet } from 'helmet';
import { default as compression } from 'compression';
import { ServerModule } from './app.module';
import { ConfigKey } from './app.config';

import * as pkg from '../package.json';

async function bootstrap() {
  const app = await NestFactory.create(ServerModule, {
    cors: false,
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

  (app.getHttpAdapter() as any).disable('x-powered-by');
  app.use(helmet());
  app.use(compression());

  const port = configService.getOrThrow('APP_PORT');
  await app.listen(port);
}
bootstrap();
