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
import { APITokenPayload } from 'src/core/api/api-token.dto';
import { Auth } from 'src/core/api/auth.decorator';
import { TicketService } from './ticket.service';
import { TicketDto } from './ticket.dto';

@ApiTags('ticket')
@ApiBearerAuth()
@Controller('ticket')
@UseGuards(AuthGuard)
export class TicketController {
  private readonly logger = new Logger(TicketController.name);

  constructor(private readonly ticketService: TicketService) {}

  @Get()
  @ApiQuery({ name: 'q', description: 'query', required: false })
  @ApiResponse({ status: 200, description: 'Get all tickets', type: [TicketDto] })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getGuildTickets(@Auth() auth: APITokenPayload, @Query('q') query: string = '') {
    return this.ticketService.searchForGuild({ guildSf: auth.aud }, query);
  }

  @Get(':thread')
  @ApiResponse({ status: 200, description: 'Get a specific ticket', type: TicketDto })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getOneTicket(@Auth() auth: APITokenPayload, @Param('thread') threadSf: string) {
    const ticket = await this.ticketService.getTicket({ threadSf });

    if (ticket.guild.guildSf !== auth.aud) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    return Object.assign(new TicketDto(), ticket, { previous: await ticket.previous });
  }
}
