import { Entity, Column, Unique, PrimaryColumn } from 'typeorm';

export enum WarFaction {
  Warden = 'WARDENS',
  Colonial = 'COLONIALS',
  None = 'NONE',
}

@Entity()
@Unique('uk_clapfoot_id_war', ['id'])
export class War {
  @PrimaryColumn({ name: 'war_number', type: 'int8', primaryKeyConstraintName: 'pk_war_number' })
  warNumber: string;

  @Column({ type: 'enum', enumName: 'faction', enum: WarFaction, default: WarFaction.None })
  winner: WarFaction;

  @Column({ name: 'clapfoot_id' })
  id: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date;
}
