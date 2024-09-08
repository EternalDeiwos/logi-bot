import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NecordPaginationModule } from '@necord/pagination';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { RMQModule } from 'src/rmq/rmq.module';
import { DiscordExceptionFilter } from './bot-exception.filter';
import { BotService, BotServiceImpl } from './bot.service';
import { DiscordService, DiscordServiceImpl } from './discord.service';

@Module({
  imports: [
    RMQModule,
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('DISCORD_BOT_TOKEN'),
        development: configService.getOrThrow<string>('APP_GUILD_ID').split(','),
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.GuildMembers,
          IntentsBitField.Flags.GuildMessages,
          IntentsBitField.Flags.MessageContent,
          IntentsBitField.Flags.GuildPresences,
        ],
      }),
    }),
    NecordPaginationModule.forRoot({
      buttons: {},
      allowSkip: true,
      allowTraversal: true,
    }),
  ],
  providers: [
    DiscordExceptionFilter,
    { provide: BotService, useClass: BotServiceImpl },
    { provide: DiscordService, useClass: DiscordServiceImpl },
  ],
  exports: [DiscordExceptionFilter, BotService, DiscordService],
})
export class BotModule {}
