import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NecordPaginationModule } from '@necord/pagination';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { DiscordExceptionFilter } from './bot-exception.filter';
import { BotService } from './bot.service';

@Module({
  imports: [
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
  providers: [DiscordExceptionFilter, BotService],
  exports: [DiscordExceptionFilter, BotService],
})
export class BotModule {}
