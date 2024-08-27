import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Unique,
  DeepPartial,
  OneToMany,
} from 'typeorm';
import { CrewShare } from '../crew/crew-share.entity';

export type InsertGuild = DeepPartial<Omit<Guild, 'createdAt' | 'deletedAt'>>;
export type SelectGuild = DeepPartial<Pick<Guild, 'id' | 'guildSf'>>;
export type GuildConfig = {
  crewAuditChannel?: string;
  globalLogChannel?: string;
  ticketTriageCrew?: string;
};

@Entity()
@Unique('uk_guild_sf_deleted_at', ['guildSf', 'deletedAt'])
export class Guild {
  @PrimaryGeneratedColumn({ type: 'int8', primaryKeyConstraintName: 'pk_guild_id' })
  id: string;

  @Column({ name: 'guild_sf', type: 'int8' })
  guildSf: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'short_name' })
  shortName: string;

  @Column({ name: 'icon', nullable: true })
  icon?: string;

  @Column({ type: 'jsonb', default: {} })
  config: GuildConfig;

  @OneToMany(() => CrewShare, (share) => share.guild)
  shared: Promise<CrewShare[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;
}
