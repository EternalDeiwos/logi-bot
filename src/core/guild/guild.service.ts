import { Injectable, Logger } from '@nestjs/common';
import { InsertResult, UpdateResult } from 'typeorm';
import { GuildConfig, InsertGuildDto } from './guild.entity';
import { GuildRepository } from './guild.repository';
import { GuildQueryBuilder } from './guild.query';
import { GuildAccessRepository } from './guild-access.repository';
import { GuildSettingRepository } from './guild-setting.repository';
import { GuildSettingName, InsertGuildSettingDto } from './guild-setting.entity';
import { InsertGuildAccessDto } from './guild-access.entity';

export abstract class GuildService {
  abstract query(): GuildQueryBuilder;
  abstract registerGuild(guild: InsertGuildDto): Promise<InsertResult>;
  abstract updateGuild(guild: InsertGuildDto): Promise<UpdateResult>;
  abstract setConfig(
    template: Required<Pick<InsertGuildSettingDto, 'updatedBy' | 'guildId'>>,
    config: GuildConfig,
  ): Promise<InsertResult>;
  abstract grantAccess(access: InsertGuildAccessDto): Promise<InsertResult>;
}

@Injectable()
export class GuildServiceImpl extends GuildService {
  private readonly logger = new Logger(GuildService.name);

  constructor(
    private readonly guildRepo: GuildRepository,
    private readonly accessRepo: GuildAccessRepository,
    private readonly settingRepo: GuildSettingRepository,
  ) {
    super();
  }

  query() {
    return new GuildQueryBuilder(this.guildRepo);
  }

  async registerGuild(guild: InsertGuildDto) {
    return this.guildRepo.upsert(guild, ['guildSf', 'deletedAt']);
  }

  async updateGuild(guild: InsertGuildDto) {
    const { id, guildSf, ...rest } = guild;
    const result = await this.guildRepo.update(id ? id : { guildSf }, rest);
    this.logger.log(`Update guild config for ${guild.name}`);
    return result;
  }

  async setConfig(
    template: Required<Pick<InsertGuildSettingDto, 'updatedBy' | 'guildId'>>,
    config: GuildConfig,
  ) {
    const records = Object.entries(config).map(([name, value]) =>
      this.settingRepo.create({ ...template, name: name as GuildSettingName, value }),
    );

    const result = this.settingRepo.upsert(records, ['guildId', 'name']);
    this.logger.log(`Updated guild config for ${template.guildId}`);
    return result;
  }

  async grantAccess(data: InsertGuildAccessDto) {
    return await this.accessRepo.insert(data);
  }
}
