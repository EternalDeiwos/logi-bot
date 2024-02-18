import {
  Entity,
  Column,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Dashboard } from './dashboard.entity';

@Entity()
@Index(['guild'])
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint')
  guild: string;

  @Column('bigint')
  channel: string;

  @OneToMany(() => Dashboard, (dashboard) => dashboard.project)
  dashboards: Dashboard[];

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at: Date;
}
