import { Injectable, Logger } from '@nestjs/common';
import { StringOption } from 'necord';
import { ConfigService } from 'src/config';
import { EchoCommand } from 'src/bot/echo.command-group';
import { TagService } from './tag.service';

export class CreateTagCommandParams {
  @StringOption({
    name: 'name',
    description: 'Tag name',
    required: true,
  })
  name: string;
}

@Injectable()
@EchoCommand({
  name: 'tag',
  description: 'Manage tags for forum posts (tickets)',
})
export class TagCommand {
  private readonly logger = new Logger(TagCommand.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tagService: TagService,
  ) {}
}
