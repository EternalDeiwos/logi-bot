import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Unique,
  DeepPartial,
} from 'typeorm';

export type InsertGuild = DeepPartial<Omit<Guild, 'createdAt' | 'deletedAt'>>;
export type SelectGuild = DeepPartial<Pick<Guild, 'id' | 'guildId'>>;
export type GuildConfig = {};

@Entity()
@Unique('uk_guild_sf_deleted_at', ['guildId', 'deletedAt'])
export class Guild {
  @PrimaryGeneratedColumn({ type: 'int8', primaryKeyConstraintName: 'pk_guild_id' })
  id: number;

  @Column({ name: 'guild_sf', type: 'int8' })
  guildId: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'short_name' })
  shortName: string;

  @Column({ name: 'icon', nullable: true })
  icon?: string;

  @Column({ type: 'jsonb', default: {} })
  config: GuildConfig;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;
}
