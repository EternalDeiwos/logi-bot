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
import { Crew } from 'src/core/crew/crew.entity';

export enum CrewAction {
  CREW_SETTING_MANAGE = 'crew.setting.manage',
  CREW_TICKET_MANAGE = 'crew.ticket.manage',
}

@Entity('crew_access')
@Unique('uk_access_rule_crew_deleted_at', ['ruleId', 'crewId', 'action', 'deletedAt'])
export class CrewAccess {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_crew_access_id',
  })
  @Expose()
  id: string;

  @Expose()
  @Column({ type: 'enum', enum: CrewAction })
  action: CrewAction;

  @Expose()
  @Column({ type: 'enum', enum: AccessMode, default: AccessMode.READ })
  access: AccessMode;

  @Column({ name: 'rule_id', type: 'uuid' })
  @RelationId((entry: CrewAccess) => entry.rule)
  @Index('rule_id_idx_crew_access')
  ruleId: string;

  @ManyToOne(() => AccessEntry, { onDelete: 'RESTRICT' })
  @Expose()
  @Type(() => AccessEntry)
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'rule_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_access_rule_id',
  })
  rule: AccessEntry;

  @Column({ name: 'crew_id', type: 'uuid' })
  @RelationId((entry: CrewAccess) => entry.crew)
  @Index('crew_id_idx_crew_access')
  crewId: string;

  @ManyToOne(() => Crew, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'crew_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_access_crew_id',
  })
  crew: Crew;

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

export class InsertCrewAccessDto extends OmitType(CrewAccess, [
  'id',
  'crew',
  'rule',
  'deletedAt',
  'createdAt',
]) {}
export class SelectCrewAccessDto extends PickType(CrewAccess, ['id']) {}
