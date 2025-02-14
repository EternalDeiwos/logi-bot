import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import {
  Entity,
  Column,
  Index,
  PrimaryColumn,
  RelationId,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Expose, Transform, Type } from 'class-transformer';
import { Guild } from 'src/core/guild/guild.entity';
import { AccessRule } from './access-rule';

export enum AccessRuleType {
  PERMIT = 'permit',
  DENY = 'deny',
}

@Entity({ name: 'access_rule' })
export class AccessEntry {
  @Expose()
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_access_rule_id',
  })
  id: string;

  @Column({ type: 'uuid', name: 'guild_id' })
  @RelationId((rule: AccessEntry) => rule.guild)
  @Index('guild_id_idx_access')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE' })
  @Expose()
  @Type(() => Guild)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_access_rule_guild_id',
  })
  guild: Guild;

  @Column()
  @Expose()
  description: string;

  @Column({ type: 'enum', enum: AccessRuleType, default: AccessRuleType.PERMIT })
  @Expose()
  type: AccessRuleType;

  @Column({ type: 'jsonb' })
  @Expose()
  @Type(() => AccessRule)
  rule: AccessRule;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  @Expose()
  updatedAt: Date;

  @Expose()
  @Column({ type: 'int8', name: 'updated_by_sf' })
  updatedBy: Snowflake;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  @Expose()
  deletedAt: Date;

  @Expose()
  @Column({ type: 'int8', name: 'deleted_by_sf', nullable: true })
  deletedBy: Snowflake;
}

export class InsertAccessEntryDto extends PartialType(
  OmitType(AccessEntry, ['id', 'guild', 'updatedAt', 'deletedAt', 'deletedBy'] as const),
) {}
export class SelectAccessEntryDto extends PartialType(PickType(AccessEntry, ['id'] as const)) {}
export class UpdateAccessEntryDto extends PartialType(
  PickType(AccessEntry, ['rule', 'updatedBy'] as const),
) {}
export class DeleteAccessEntryDto extends PartialType(
  PickType(AccessEntry, ['id', 'deletedBy'] as const),
) {}
