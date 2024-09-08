import { Entity, Column, CreateDateColumn, PrimaryColumn, DeepPartial, OneToMany } from 'typeorm';
import { Snowflake } from 'discord.js';
import { CrewShare } from 'src/core/crew/share/crew-share.entity';
import { Team } from 'src/core/team/team.entity';

export type InsertGuild = DeepPartial<Omit<Guild, 'shared' | 'createdAt' | 'deletedAt'>>;
export type SelectGuild = DeepPartial<Pick<Guild, 'guild'>>;
export type GuildConfig = {
  crewAuditChannel?: string;
  globalLogChannel?: string;
  ticketTriageCrew?: string;
  crewCreatorRole?: string;
  crewViewerRole?: string;
};

@Entity({ name: 'guild' })
export class Guild {
  @PrimaryColumn({ type: 'bigint', name: 'guild_sf', primaryKeyConstraintName: 'pk_guild_sf' })
  guild: Snowflake;

  @Column()
  name: string;

  @Column({ name: 'name_short' })
  shortName: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ type: 'jsonb', default: {} })
  config: GuildConfig;

  @OneToMany(() => CrewShare, (share) => share.guild)
  shared: Promise<CrewShare[]>;

  @OneToMany(() => Team, (team) => team.parent)
  teams: Promise<Team[]>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
