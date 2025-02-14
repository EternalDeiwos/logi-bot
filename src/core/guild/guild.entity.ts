import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import {
  Entity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Unique,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { CrewShare } from 'src/core/crew/share/crew-share.entity';
import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import { GuildAccess } from './guild-access.entity';
import { GuildSetting, GuildSettingName } from './guild-setting.entity';

export type GuildConfig = Partial<Record<GuildSettingName, string>>;

@Entity()
@Unique('uk_guild_sf_deleted_at', ['guildSf', 'deletedAt'])
export class Guild {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_guild_id',
  })
  id: string;

  @Expose()
  @Column({ name: 'guild_sf', type: 'int8' })
  guildSf: string;

  @Expose()
  @Column({ name: 'name' })
  name: string;

  @Expose()
  @Column({ name: 'short_name' })
  shortName: string;

  @Expose()
  @Column({ name: 'icon', nullable: true })
  icon?: string;

  @OneToMany(() => CrewShare, (share) => share.guild)
  shared: CrewShare[];

  @Expose()
  @OneToMany(() => GuildAccess, (access) => access.guild)
  access: GuildAccess[];

  @Expose()
  @OneToMany(() => GuildSetting, (setting) => setting.guild)
  settings: GuildSetting[];

  @Expose()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Expose()
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;

  getConfig() {
    return this.settings.reduce((config, current) => {
      config[current.name] = current.value;
      return config;
    }, {} as GuildConfig);
  }
}

export class InsertGuildDto extends PartialType(
  OmitType(Guild, ['createdAt', 'deletedAt', 'shared', 'access', 'settings'] as const),
) {}
export class SelectGuildDto extends PartialType(PickType(Guild, ['id', 'guildSf'] as const)) {}
