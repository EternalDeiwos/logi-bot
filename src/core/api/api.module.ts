import { Module } from '@nestjs/common';
import { BotModule } from 'src/bot/bot.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { ApiCommand } from './api.command';
import { ApiService, ApiServiceImpl } from './api.service';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [RMQModule, BotModule],
  providers: [{ provide: ApiService, useClass: ApiServiceImpl }, ApiCommand, AuthGuard],
  exports: [ApiService],
})
export class ApiModule {}
