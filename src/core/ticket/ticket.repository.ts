import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommonRepository } from 'src/database/util';
import { Ticket } from './ticket.entity';

@Injectable()
export class TicketRepository extends CommonRepository<Ticket> {
  constructor(private readonly dataSource: DataSource) {
    super(Ticket, dataSource.createEntityManager());
  }
}
