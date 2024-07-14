import { Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Context, ContextOf, On } from 'necord';

@Injectable()
export class StockpileService {
  private readonly logger = new Logger(StockpileService.name);

  constructor(private readonly supabase: SupabaseClient) {}

  @On('ready')
  async onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }
}
