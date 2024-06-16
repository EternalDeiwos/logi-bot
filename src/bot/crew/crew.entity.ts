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
  DeleteDateColumn,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { ForumTagTemplate } from 'src/bot/tag/tag-template.entity';
import { Ticket } from 'src/bot/ticket/ticket.entity';
import { Team } from 'src/bot/team/team.entity';
import { CrewMember } from './crew-member.entity';
import { CrewLog } from './crew-log.entity';

@Entity({ name: 'crew' })
@Unique('unique_crew_tag_name', ['guild', 'shortName', 'deletedAt'])
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

  @Column({ type: 'boolean', name: 'permanent', default: false })
  permanent: boolean;

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

  @OneToMany(() => CrewLog, (log) => log.crew)
  logs: Promise<CrewLog[]>;

  @Column({ type: 'bigint', name: 'created_by_sf' })
  createdBy: Snowflake;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;

  async getCrewTag() {
    const tags = await this.team.tags;
    return tags.find((tag) => tag.name === this.shortName);
  }

  async getCrewOwner() {
    const members = await this.members;
    return members.find((member) => member.access === CrewMemberAccess.OWNER);
  }
}
