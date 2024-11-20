import { Expose } from 'class-transformer';
import { Entity, Column, Unique, PrimaryColumn } from 'typeorm';

export enum WarFaction {
  Warden = 'WARDENS',
  Colonial = 'COLONIALS',
  None = 'NONE',
}

@Entity()
@Unique('uk_clapfoot_id_war', ['id'])
export class War {
  @Expose()
  @PrimaryColumn({ name: 'war_number', type: 'int8', primaryKeyConstraintName: 'pk_war_number' })
  warNumber: string;

  @Expose()
  @Column({ type: 'enum', enumName: 'faction', enum: WarFaction, default: WarFaction.None })
  winner: WarFaction;

  @Expose()
  @Column({ name: 'clapfoot_id' })
  id: string;

  @Expose()
  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Expose()
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date;
}
