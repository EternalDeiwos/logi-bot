import { ClassSerializerInterceptor, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { default as helmet } from 'helmet';
import { default as compression } from 'compression';
import { ServerModule } from './app.module';
import { ConfigKey } from './app.config';

import * as pkg from '../package.json';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(ServerModule, {
    cors: false,
    logger:
      process.env.NODE_ENV === 'production'
        ? ['fatal', 'error', 'warn', 'log']
        : ['fatal', 'error', 'warn', 'log', 'debug'],
  });

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      strategy: 'excludeAll',
    }),
  );

  app.enableVersioning({ defaultVersion: '1', type: VersioningType.URI });

  const configService = app.get(ConfigService<Record<ConfigKey, unknown>>);
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Logi Bot')
    .setDescription(pkg.description)
    .setVersion(process.env.NODE_ENV === 'production' ? pkg.version : 'unstable')
    .addBearerAuth()
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDoc, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  (app.getHttpAdapter() as any).disable('x-powered-by');
  app.use(helmet());
  app.use(compression());

  const port = configService.getOrThrow('APP_PORT');
  await app.listen(port);
}
bootstrap();
