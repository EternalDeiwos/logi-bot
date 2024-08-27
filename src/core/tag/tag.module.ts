import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { ForumTag } from './tag.entity';
import { ForumTagTemplate } from './tag-template.entity';
import { TagRepository } from './tag.repository';
// import { TagService } from './tag.service';
import { TagTemplateRepository } from './tag-template.repository';

@Module({
  imports: [BotModule, RMQModule, TypeOrmModule.forFeature([ForumTag, ForumTagTemplate])],
  providers: [
    TagRepository,
    // TagService,
    TagTemplateRepository,
  ],
  // exports: [TagService],
})
export class TagModule {}
