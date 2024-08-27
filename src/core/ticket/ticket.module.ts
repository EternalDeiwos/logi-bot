import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { RMQModule } from 'src/rmq/rmq.module';
import { Ticket } from './ticket.entity';
import { TicketRepository } from './ticket.repository';
// import { TicketService } from './ticket.service';

@Module({
  imports: [BotModule, RMQModule, TypeOrmModule.forFeature([Ticket])],
  providers: [
    TicketRepository,
    // TicketService
  ],
  // exports: [TicketService],
})
export class TicketModule {}
