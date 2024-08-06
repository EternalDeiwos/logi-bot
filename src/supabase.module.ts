import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: SupabaseClient,
      inject: [ConfigService],
      useFactory(configService: ConfigService) {
        return createClient(
          configService.getOrThrow('SUPABASE_URL'),
          configService.getOrThrow('SUPABASE_SERVICE_KEY'),
        );
      },
    },
  ],
  exports: [SupabaseClient],
})
export class SupabaseModule {}
