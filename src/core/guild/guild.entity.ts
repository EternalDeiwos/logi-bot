import {
  Entity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Unique,
  DeepPartial,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { CrewShare } from 'src/core/crew/share/crew-share.entity';

export type InsertGuild = DeepPartial<Omit<Guild, 'createdAt' | 'deletedAt'>>;
export type SelectGuild = DeepPartial<Pick<Guild, 'id' | 'guildSf'>>;
export type GuildConfig = {
  crewAuditChannel?: string;
  globalLogChannel?: string;
  globalVoiceCategory?: string;
  ticketTriageCrew?: string;
  crewCreatorRole?: string;
  crewViewerRole?: string;
  crewLeaderRole?: string;
};

@Entity()
@Unique('uk_guild_sf_deleted_at', ['guildSf', 'deletedAt'])
export class Guild {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_guild_id',
  })
  id: string;

  @Expose()
  @Column({ name: 'guild_sf', type: 'int8' })
  guildSf: string;

  @Expose()
  @Column({ name: 'name' })
  name: string;

  @Expose()
  @Column({ name: 'short_name' })
  shortName: string;

  @Expose()
  @Column({ name: 'icon', nullable: true })
  icon?: string;

  @Column({ type: 'jsonb', default: {} })
  config: GuildConfig;

  @OneToMany(() => CrewShare, (share) => share.guild)
  shared: Promise<CrewShare[]>;

  @Expose()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Expose()
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;
}
