import { Entity, Column, CreateDateColumn, PrimaryColumn } from 'typeorm';
import { Snowflake } from 'discord.js';

@Entity({ name: 'guild' })
export class Guild {
  @PrimaryColumn({ type: 'bigint', name: 'guild_sf' })
  guild: Snowflake;

  @Column()
  name: string;

  @Column({ name: 'name_short' })
  shortName: string;

  @Column({ nullable: true })
  icon: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
