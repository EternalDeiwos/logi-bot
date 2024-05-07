import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from 'src/config';
import { Ticket } from './ticket.entity';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
  ) {}
}
