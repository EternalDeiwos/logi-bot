import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import {
  Entity,
  Column,
  Index,
  OneToMany,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  PrimaryColumn,
  RelationId,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Expose } from 'class-transformer';
import { Guild } from 'src/core/guild/guild.entity';
import { Crew } from 'src/core/crew/crew.entity';

@Entity()
@Unique('uk_name_guild_id_team', ['name', 'guildId', 'deletedAt'])
export class Team {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_team_id',
  })
  id: string;

  @Expose()
  @Column()
  @Index('name_idx_team')
  name: string;

  @Column({ type: 'uuid', name: 'guild_id' })
  @RelationId((team: Team) => team.guild)
  @Index('guild_id_idx_team')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_team_guild_id',
  })
  guild: Guild;

  @Expose()
  @Column({
    type: 'int8',
    name: 'forum_channel_sf',
    comment: 'Forum where crew tickets will be sent',
  })
  @Index('forum_channel_sf_idx_team')
  forumSf: Snowflake;

  @Expose()
  @Column({
    type: 'int8',
    name: 'category_channel_sf',
    comment: 'Category where crew channels will be created',
  })
  @Index('category_channel_sf_idx_team')
  categorySf: Snowflake;

  @OneToMany(() => Crew, (crew) => crew.team)
  crews: Crew[];

  @Expose()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Expose()
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;
}

export class InsertTeamDto extends PartialType(
  OmitType(Team, ['createdAt', 'deletedAt', 'guild', 'crews'] as const),
) {}
export class SelectTeamDto extends PartialType(PickType(Team, ['id'] as const)) {}
