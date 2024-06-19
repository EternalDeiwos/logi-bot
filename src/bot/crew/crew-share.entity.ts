import {
  Entity,
  Column,
  Index,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Guild } from 'src/bot/guild/guild.entity';
import { Crew } from './crew.entity';

@Entity({ name: 'crew_share' })
@Index('crew_share_unique', ['target', 'channel'], { unique: true })
export class CrewShare {
  @PrimaryColumn({ type: 'bigint', name: 'crew_channel_sf' })
  @RelationId((share: CrewShare) => share.crew)
  channel: Snowflake;

  @PrimaryColumn({ type: 'bigint', name: 'target_guild_sf' })
  @RelationId((target: CrewShare) => target.guild)
  target: Snowflake;

  @ManyToOne(() => Crew, (crew) => crew.members, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'crew_channel_sf',
    referencedColumnName: 'channel',
  })
  crew: Crew;

  @ManyToOne(() => Guild)
  @JoinColumn({
    name: 'target_guild_sf',
    referencedColumnName: 'guild',
  })
  guild: Guild;

  @Column({ type: 'bigint', name: 'created_by_sf' })
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;
}
