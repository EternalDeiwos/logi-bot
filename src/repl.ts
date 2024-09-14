import { repl } from '@nestjs/core';
import { ReplModule } from './app.module';

async function bootstrap() {
  await repl(ReplModule);
}
bootstrap();
