import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/config';
import { databaseProviders } from '.';

@Module({
  imports: [ConfigModule],
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
