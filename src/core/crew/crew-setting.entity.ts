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
import { Crew } from './crew.entity';

export enum CrewSettingName {
  CREW_TICKET_HELP_TEXT = 'crew.ticket_help',
  CREW_PERMANENT = 'crew.enable_permanent',
  CREW_OPSEC = 'crew.enable_opsec',
  CREW_PRUNING = 'crew.enable_pruning',
  CREW_VOICE_CHANNEL = 'crew.enable_voice',
  CREW_TEXT_CHANNEL = 'crew.enable_text',
  CREW_TRIAGE = 'crew.enable_triage',
}

@Entity('crew_setting')
@Unique('uk_setting_name_crew', ['name', 'crewId'])
export class CrewSetting {
  @Expose()
  @PrimaryColumn({
    type: 'enum',
    enum: CrewSettingName,
    primaryKeyConstraintName: 'pk_crew_setting',
  })
  name: CrewSettingName;

  @PrimaryColumn({
    name: 'crew_id',
    type: 'uuid',
    primaryKeyConstraintName: 'pk_crew_setting',
  })
  @RelationId((setting: CrewSetting) => setting.crew)
  @Index('crew_id_idx_crew_setting')
  crewId: string;

  @ManyToOne(() => Crew, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'crew_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_crew_setting_crew_id',
  })
  crew: Crew;

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

export class InsertCrewSettingDto extends OmitType(CrewSetting, ['crew', 'updatedAt']) {}
export class SelectCrewSettingDto extends PickType(CrewSetting, ['crewId', 'name']) {}
