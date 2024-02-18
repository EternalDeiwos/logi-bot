import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

export enum DashboardType {
  ProjectSummary,
}

@Entity()
@Index(['guild'])
@Index(['project'])
export class Dashboard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint')
  guild: string;

  @Column('bigint')
  channel: string;

  @Column('bigint')
  message: string;

  @Column({
    type: 'enum',
    enum: DashboardType,
    default: DashboardType.ProjectSummary,
  })
  type: DashboardType;

  @ManyToOne(() => Project, (project) => project.dashboards)
  @JoinColumn({
    name: 'project_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_project_id',
  })
  project: Project;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at: Date;
}
