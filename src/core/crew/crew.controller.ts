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
import { ApiBearerAuth, ApiExtraModels, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/core/api/auth.guard';
import { Auth } from 'src/core/api/auth.decorator';
import { APITokenPayload } from 'src/core/api/api-token.dto';
import { GuildDto } from 'src/core/guild/guild.dto';
import { TicketService } from 'src/core/ticket/ticket.service';
import { TicketDto } from 'src/core/ticket/ticket.dto';
import { CrewService } from './crew.service';
import { CrewDto } from './crew.dto';

@ApiTags('crew')
@ApiBearerAuth()
@Controller('crew')
@ApiExtraModels(CrewDto, GuildDto)
@UseGuards(AuthGuard)
export class CrewController {
  private readonly logger = new Logger(CrewController.name);

  constructor(
    private readonly crewService: CrewService,
    private readonly ticketService: TicketService,
  ) {}

  @Get()
  @ApiQuery({ name: 'q', description: 'query', required: false })
  @ApiResponse({
    status: 200,
    description: 'Diagnostic information for the service',
    type: [CrewDto],
  })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  async getCrew(@Auth() auth: APITokenPayload, @Query('q') query: string = '') {
    const crews = await this.crewService.search({ guildSf: auth.aud }, query, true);
    return Promise.all(
      crews.map(async (crew) => {
        return Object.assign(new CrewDto(), crew, { members: await crew.members });
      }),
    );
  }

  @Get(':crew')
  @ApiResponse({ status: 200, description: 'Get a specific crew', type: CrewDto })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getOneCrew(@Auth() auth: APITokenPayload, @Param('crew') crewSf: string) {
    const crew = await this.crewService.getCrew({ crewSf }, true);
    const shared = await Promise.all((await crew.guild.shared).map(async (shared) => shared.guild));

    if (
      crew.guild.guildSf !== auth.aud &&
      shared.findIndex((shared) => shared.guildSf === auth.aud) === -1
    ) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    return Object.assign(new CrewDto(), crew, { members: await crew.members });
  }

  @Get(':crew/ticket')
  @ApiQuery({ name: 'q', description: 'query', required: false })
  @ApiResponse({ status: 200, description: 'Get crew tickets', type: TicketDto })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getCrewTickets(
    @Auth() auth: APITokenPayload,
    @Param('crew') crewSf: string,
    @Query('q') query: string = '',
  ) {
    const tickets = await this.ticketService.searchForCrew({ crewSf }, query);

    if (!tickets.length) {
      return tickets;
    }

    if (tickets[0].guild.guildSf !== auth.aud) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    return tickets.map((ticket) => Object.assign(new TicketDto(), ticket));
  }
}
