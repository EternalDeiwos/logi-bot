import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  PrimaryColumn,
  OneToMany,
  RelationId,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { ForumTagTemplate } from 'src/bot/tag/tag-template.entity';
import { Ticket } from 'src/bot/ticket/ticket.entity';
import { Team } from 'src/bot/team/team.entity';
import { CrewMember } from './crew-member.entity';

@Entity({ name: 'crew' })
@Unique('unique_short_name', ['guild', 'shortName'])
export class Crew {
  @PrimaryColumn({ type: 'bigint', name: 'crew_channel_sf' })
  channel: Snowflake;

  @Column({ type: 'bigint', name: 'guild_sf' })
  @Index()
  guild: Snowflake;

  @Column()
  name: string;

  @Column({ name: 'name_short' })
  shortName: string;

  @Column()
  slug: string;

  @Column({ type: 'bigint', name: 'role_sf' })
  @Index()
  role: Snowflake;

  @Column({ type: 'boolean', name: 'enable_move_prompt', default: false })
  movePrompt: boolean;

  @Column({ type: 'bigint', name: 'forum_channel_sf' })
  @RelationId((crew: Crew) => crew.team)
  @Index()
  forum: Snowflake;

  @ManyToOne(() => Team, (team) => team.crews, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({
    name: 'forum_channel_sf',
    referencedColumnName: 'forum',
  })
  team: Team;

  @OneToMany(() => CrewMember, (member) => member.crew)
  members: Promise<CrewMember[]>;

  @OneToMany(() => ForumTagTemplate, (tag) => tag.crew)
  tags: Promise<ForumTagTemplate[]>;

  @OneToMany(() => Ticket, (ticket) => ticket.crew)
  tickets: Promise<Ticket[]>;

  @Column({ type: 'bigint', name: 'created_by_sf' })
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  async getCrewTag() {
    const tags = await this.team.tags;
    return tags.find((tag) => tag.name === this.shortName);
  }
}
