import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import {
  Entity,
  Column,
  DeleteDateColumn,
  Index,
  CreateDateColumn,
  RelationId,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Snowflake } from 'discord.js';
import { Expose, Transform } from 'class-transformer';
import { Guild } from 'src/core/guild/guild.entity';
import { Crew } from 'src/core/crew/crew.entity';

@Entity()
export class Ticket {
  @Expose()
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'uuidv7()',
    primaryKeyConstraintName: 'pk_ticket_id',
  })
  id: string;

  @Expose()
  @Column({ type: 'int8', name: 'thread_sf' })
  threadSf: Snowflake;

  @Column({ type: 'uuid', name: 'guild_id' })
  @Index('guild_id_idx_ticket')
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE', eager: true })
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'guild_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_ticket_guild_id',
  })
  guild: Guild;

  @Expose()
  @Column({ type: 'uuid', name: 'previous_ticket_id', nullable: true })
  @RelationId((ticket: Ticket) => ticket.previous)
  @Index('previous_ticket_id_idx_ticket')
  previousTicketId: string;

  @ManyToOne(() => Ticket, { onDelete: 'RESTRICT', nullable: true })
  @Expose()
  @Transform(({ value }) => (value && 'id' in value ? value : null))
  @JoinColumn({
    name: 'previous_ticket_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_ticket_previous_ticket_id',
  })
  previous: Ticket;

  @Column({ type: 'uuid', name: 'crew_id' })
  @Expose()
  @RelationId((ticket: Ticket) => ticket.crew)
  @Index('crew_id_idx_ticket')
  crewId: string;

  @ManyToOne(() => Crew, (crew) => crew.tickets, { onDelete: 'CASCADE', eager: true })
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  @JoinColumn({
    name: 'crew_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_ticket_crew_id',
  })
  crew: Crew;

  @Expose()
  @Column({ name: 'content', type: 'text' })
  content: string;

  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({ name: 'sort_order', default: '' })
  @Index('sort_order_idx_ticket')
  sortOrder: string;

  @Column({ type: 'timestamptz', name: 'processed_at', nullable: true })
  processedAt: Date;

  @Expose()
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Expose()
  @Column({ type: 'int8', name: 'updated_by_sf' })
  updatedBy: Snowflake;

  @Expose()
  @Column({ type: 'int8', name: 'created_by_sf' })
  createdBy: Snowflake;

  @Expose()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Expose()
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt: Date;
}

export class InsertTicketDto extends PartialType(
  OmitType(Ticket, [
    'id',
    'crew',
    'previous',
    'guild',
    'updatedAt',
    'createdAt',
    'deletedAt',
  ] as const),
) {}
export class SelectTicketDto extends PartialType(PickType(Ticket, ['id', 'threadSf'] as const)) {}
