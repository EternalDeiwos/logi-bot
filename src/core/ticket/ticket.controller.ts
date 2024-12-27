import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/core/api/auth.guard';
import { Auth } from 'src/core/api/auth.decorator';
import { APITokenPayload } from 'src/core/api/api.service';
import { TicketService } from './ticket.service';
import { Ticket } from './ticket.entity';

@ApiTags('ticket')
@ApiBearerAuth()
@Controller('ticket')
@UseGuards(AuthGuard)
export class TicketController {
  private readonly logger = new Logger(TicketController.name);

  constructor(private readonly ticketService: TicketService) {}

  @Get()
  @ApiQuery({ name: 'q', description: 'query', required: false })
  @ApiResponse({ status: 200, description: 'Get all tickets', type: [Ticket] })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getGuildTickets(@Auth() auth: APITokenPayload, @Query('q') query: string = '') {
    return await this.ticketService
      .query()
      .byGuild({ guildSf: auth.aud })
      .withCrew()
      .withTeam()
      .withPreviousCrew()
      .withPreviousGuild()
      .withPreviousTeam()
      .search(query)
      .withActiveOnly()
      .getMany();
  }

  @Get(':thread')
  @ApiResponse({ status: 200, description: 'Get a specific ticket', type: Ticket })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getOneTicket(@Auth() auth: APITokenPayload, @Param('thread') threadSf: string) {
    const ticket = await this.ticketService
      .query()
      .byTicket({ threadSf })
      .withCrew()
      .withTeam()
      .withPreviousCrew()
      // .withPreviousGuild()
      .withPreviousTeam()
      .getOneOrFail();

    if (ticket.guild.guildSf !== auth.aud) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    return ticket;
  }
}
