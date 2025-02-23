import { OmitType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Snowflake } from 'discord.js';
import {
  Entity,
  Column,
  Index,
  RelationId,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Guild } from './guild.entity';

export enum GuildSettingName {
  GUILD_VOICE_CATEGORY = 'guild.voice_category',
  GUILD_TRIAGE_CREW = 'guild.triage_crew_sf',
  GUILD_LOG_CHANNEL = 'guild.log_channel',
  GUILD_CREW_PREFIX = 'guild.crew_prefix',
  STOCKPILE_LOG_CHANNEL = 'stockpile.log_channel',
  COUNTER_LOG_CHANNEL = 'counter.log_channel',
  CREW_DEFAULT_AUDIT_CHANNEL = 'crew.audit_channel',
  CREW_DETAULT_ROLE = 'crew.viewer_role',
  CREW_LEADER_ROLE = 'crew.leader_role',
}

@Entity('guild_setting')
@Unique('uk_setting_name_guild', ['name', 'guildId'])
export class GuildSetting {
  @Expose()
  @PrimaryColumn({
    type: 'enum',
    enum: GuildSettingName,
    primaryKeyConstraintName: 'pk_guild_setting',
  })
  name: GuildSettingName;

  @PrimaryColumn({
    name: 'guild_id',
    type: 'uuid',
    primaryKeyConstraintName: 'pk_guild_setting',
  })
  @RelationId((setting: GuildSetting) => setting.guild)
  @Index('guild_id_idx_guild_setting')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_guild_setting_guild_id',
  })
  guild: Guild;

  @Expose()
  @Column()
  value: string;

  @Column({ type: 'int8', name: 'updated_by_sf' })
  @Expose()
  updatedBy: Snowflake;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  @Expose()
  updatedAt: Date;

  asString() {
    return this.value;
  }

  asSnowflake(): Snowflake {
    return this.asString();
  }

  asNumber() {
    return parseFloat(this.value);
  }

  asBoolean() {
    return /true|yes/i.test(this.value) || Boolean(parseFloat(this.value));
  }
}

export class InsertGuildSettingDto extends OmitType(GuildSetting, ['guild', 'updatedAt']) {}
export class SelectGuildSettingDto extends PickType(GuildSetting, ['guildId', 'name']) {}
