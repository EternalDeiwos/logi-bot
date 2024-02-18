import { Module } from '@nestjs/common';
import { IntentsBitField } from 'discord.js';
import { NecordModule } from 'necord';
import { Config, ConfigModule, ConfigService } from 'src/config';

@Module({
  imports: [
    ConfigModule,
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>(Config.DISCORD_BOT_TOKEN),
        development: [configService.getOrThrow<string>(Config.APP_GUILD_ID)],
        intents: [IntentsBitField.Flags.Guilds],
      }),
    }),
  ],
})
export class BotModule {}
