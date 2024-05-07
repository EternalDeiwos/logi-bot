import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from 'src/config';
import { ForumTag } from './tag.entity';
import { ForumTagTemplate } from './tag-template.entity';

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ForumTag) private readonly tagRepo: Repository<ForumTag>,
    @InjectRepository(ForumTagTemplate) private readonly templateRepo: Repository<ForumTagTemplate>,
  ) {}
}
