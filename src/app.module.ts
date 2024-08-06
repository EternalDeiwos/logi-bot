import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { default as Joi } from 'joi';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { SupabaseModule } from './supabase.module';
import { StockpileModule } from './stockpile/stockpile.module';
import { AppController } from './app.controller';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        '.env.local',
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        '.env',
      ],
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production').default('production'),

        // Supabase config
        SUPABASE_URL: Joi.string().uri().default('http://localhost:54321'),
        SUPABASE_JWT_SECRET: Joi.string(),
        SUPABASE_ANON_KEY: Joi.string(),
        SUPABASE_SERVICE_KEY: Joi.string().required(),
        SUPABASE_AWS_S3_ACCESS_KEY_ID: Joi.string().required(),
        SUPABASE_AWS_S3_SECRET_ACCESS_KEY: Joi.string().required(),
        SUPABASE_AWS_S3_REGION: Joi.string().default('local'),

        // Bot config
        DISCORD_BOT_TOKEN: Joi.string().required(),
        DISCORD_BOT_CLIENT_ID: Joi.string().required(),
        DISCORD_BOT_PERMISSIONS: Joi.string().default('19097840626768'),
        DISCORD_BOT_SCOPE: Joi.string().default('bot applications.commands'),

        // Application config
        APP_GUILD_ID: Joi.string().required(),
        APP_PORT: Joi.number().port().default(8080),
      }),
    }),
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('DISCORD_BOT_TOKEN'),
        development: configService.getOrThrow<string>('APP_GUILD_ID').split(','),
        intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers],
      }),
    }),
    SupabaseModule,
    StockpileModule,
  ],
  controllers: [AppController],
  providers: [PermissionsService],
  exports: [],
})
export class AppModule {}
