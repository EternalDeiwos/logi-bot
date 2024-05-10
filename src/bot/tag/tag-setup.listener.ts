import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { ConfigService } from 'src/config';
import { TagService } from 'src/bot/tag/tag.service';

@Injectable()
export class TagSetupListener {
  private readonly logger = new Logger(TagSetupListener.name);

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
}
