import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';

@Entity()
export class Project {
  @PrimaryColumn({ type: 'bigint' })
  id: string;
}
