import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [ConfigModule, DatabaseModule, BotModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
