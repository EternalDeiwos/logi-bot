import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Ticket } from './ticket.entity';

@Injectable()
export class TicketRepository extends Repository<Ticket> {
  constructor(private readonly dataSource: DataSource) {
    super(Ticket, dataSource.createEntityManager());
  }
}
