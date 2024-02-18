import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/config';
import { DatabaseModule } from 'src/database';
import { BotModule } from 'src/bot';
import { AppController } from './app.controller';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [ConfigModule, DatabaseModule, BotModule],
  controllers: [AppController],
  providers: [PermissionsService],
})
export class AppModule {}
