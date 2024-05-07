import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbedBuilder, GuildChannelResolvable, GuildMember, roleMention } from 'discord.js';
import { ConfigService } from 'src/config';
import { OperationStatus } from 'src/types';
import { CrewService } from 'src/bot/crew/crew.service';
import { Ticket } from './ticket.entity';
import { ticketTriageMessage } from './ticket.messages';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly crewService: CrewService,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async createTicket(
    channelRef: GuildChannelResolvable,
    member: GuildMember,
    title: string,
    content: string,
  ): Promise<OperationStatus> {
    const guild = member.guild;
    const channel = guild.channels.cache.get(
      typeof channelRef === 'string' ? channelRef : channelRef.id,
    );

    if (!channel) {
      return { success: false, message: 'Invalid channel' };
    }

    const crew = await this.crewService.getCrew(channel);

    if (!crew) {
      return { success: false, message: `${channel} does not belong to a crew` };
    }

    const forum = guild.channels.cache.get(crew.team.forum);

    if (!forum || !forum.isThreadOnly()) {
      return { success: false, message: `${roleMention(crew.role)} does not have a forum` };
    }

    const prompt = new EmbedBuilder()
      .setColor(0x333333)
      .setTitle('New Ticket')
      .setDescription(ticketTriageMessage(member.id, crew.role));

    const thread = await forum.threads.create({
      name: title,
      message: {
        content: `${content} ${member} ${roleMention(crew.role)}`,
        embeds: [prompt],
        allowedMentions: { users: [member.id], roles: [crew.role] },
      },
    });

    await this.ticketRepo.insert({
      thread: thread.id,
      guild: guild.id,
      discussion: crew.channel,
      name: title,
      content,
      createdBy: member.id,
      updatedBy: member.id,
    });

    return { success: true, message: 'Done' };
  }
}
