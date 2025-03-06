import { OmitType, PickType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { Snowflake } from 'discord.js';
import {
  Entity,
  Column,
  Index,
  RelationId,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  DeleteDateColumn,
  Unique,
} from 'typeorm';
import { AccessMode } from 'src/types';
import { AccessEntry } from 'src/core/access/access.entity';
import { Guild } from './guild.entity';

export enum GuildAction {
  GUILD_SETTING_MANAGE = 'guild.setting.manage',
  CREW_MANAGE = 'crew.manage',
  STOCKPILE_MANAGE = 'stockpile.manage',
}

@Entity('guild_access')
@Unique('uk_access_rule_guild_deleted_at', ['ruleId', 'guildId', 'action', 'deletedAt'])
export class GuildAccess {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_guild_access_id',
  })
  @Expose()
  id: string;

  @Expose()
  @Column({ type: 'enum', enum: GuildAction })
  action: GuildAction;

  @Expose()
  @Column({ type: 'enum', enum: AccessMode, default: AccessMode.READ })
  access: AccessMode;

  @Column({ name: 'rule_id', type: 'uuid' })
  @RelationId((entry: GuildAccess) => entry.rule)
  @Index('rule_id_idx_guild_access')
  ruleId: string;

  @ManyToOne(() => AccessEntry, { onDelete: 'RESTRICT' })
  @Expose()
  @Type(() => AccessEntry)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'rule_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_guild_access_rule_id',
  })
  rule: AccessEntry;

  @Column({ name: 'guild_id', type: 'uuid' })
  @RelationId((entry: GuildAccess) => entry.guild)
  @Index('guild_id_idx_guild_access')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_guild_access_guild_id',
  })
  guild: Guild;

  @Column({ type: 'int8', name: 'created_by_sf' })
  @Expose()
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  @Expose()
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  @Expose()
  deletedAt: Date;
}

export class InsertGuildAccessDto extends OmitType(GuildAccess, [
  'id',
  'guild',
  'rule',
  'deletedAt',
  'createdAt',
]) {}
export class SelectGuildAccessDto extends PickType(GuildAccess, ['id']) {}
