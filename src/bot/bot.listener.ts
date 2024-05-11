import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { ConfigService } from 'src/config';
import { TagService } from 'src/bot/tag/tag.service';

@Injectable()
export class BotEventListener {
  private readonly logger = new Logger(BotEventListener.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tagService: TagService,
  ) {}

  @On('guildCreate')
  async onGuildCreate(@Context() [guild]: ContextOf<'guildCreate'>) {
    const member = await guild.members.fetchMe();
    const result = await this.tagService.createTicketTags(member);

    if (result.success) {
      this.logger.log('Creating guild tags');
    } else {
      this.logger.warn(`Failed to create guild tags: ${result.message}`);
    }
  }

  @On('guildDelete')
  async onGuildDelete(@Context() [guild]: ContextOf<'guildDelete'>) {
    const member = await guild.members.fetchMe();
    const result = await this.tagService.deleteTagTemplates(member);

    if (!result.success) {
      return this.logger.warn(`Failed to delete guild tags: ${result.message}`);
    }
  }
}
