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
import { APITokenPayload } from 'src/core/api/api.service';
import { Guild } from 'src/core/guild/guild.entity';
import { Ticket } from 'src/core/ticket/ticket.entity';
import { CrewLog } from './log/crew-log.entity';
import { CrewService } from './crew.service';
import { Crew } from './crew.entity';

@ApiTags('crew')
@ApiBearerAuth()
@Controller('crew')
@ApiExtraModels(Crew, Guild)
@UseGuards(AuthGuard)
export class CrewController {
  private readonly logger = new Logger(CrewController.name);

  constructor(private readonly crewService: CrewService) {}

  @Get()
  @ApiQuery({ name: 'q', description: 'query', required: false })
  @ApiQuery({
    name: 'shared',
    description: 'Include crews shared from other guilds?',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Diagnostic information for the service',
    type: [Crew],
  })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  async getCrew(
    @Auth() auth: APITokenPayload,
    @Query('q') query: string = '',
    @Query('shared') shared: string = '',
  ) {
    const qb = this.crewService.query().withTeam().withMembers();
    return shared && !['f', 'false', 'n', 'no'].includes(shared.trim().toLowerCase())
      ? await qb.searchByGuildWithShared({ guildSf: auth.aud }, query).getMany()
      : await qb.searchByGuild({ guildSf: auth.aud }, query).getMany();
  }

  @Get(':crew')
  @ApiResponse({ status: 200, description: 'Get a specific crew', type: Crew })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getOneCrew(@Auth() auth: APITokenPayload, @Param('crew') crewSf: string) {
    const crew = await this.crewService
      .query()
      .withDeleted()
      .withTeam()
      .withMembers()
      .withShared()
      .byCrew({ crewSf })
      .getOneOrFail();

    if (
      crew.guild.guildSf !== auth.aud &&
      crew.shared.findIndex((shared) => shared.guild.guildSf === auth.aud) === -1
    ) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    return crew;
  }

  @Get(':crew/ticket')
  @ApiResponse({ status: 200, description: 'Get crew tickets', type: [Ticket] })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getCrewTickets(@Auth() auth: APITokenPayload, @Param('crew') crewSf: string) {
    let crew: Crew;
    try {
      crew = await this.crewService
        .query()
        .byCrew({ crewSf })
        .withTeam()
        .withTickets()
        .withShared()
        .getOneOrFail();
    } catch (err) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    if (
      crew.guild.guildSf !== auth.aud &&
      crew.shared.findIndex((shared) => shared.guild.guildSf === auth.aud) === -1
    ) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    const tickets = crew.tickets;

    if (!tickets.length) {
      return [];
    } else {
      tickets.forEach((ticket) => {
        ticket.guild = crew.guild;
        ticket.crew = crew;
      });

      crew.tickets = null;
      crew.guild = null;
    }

    return tickets;
  }

  @Get(':crew/log')
  @ApiResponse({ status: 200, description: 'Get crew logs', type: [CrewLog] })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getCrewLogs(@Auth() auth: APITokenPayload, @Param('crew') crewSf: string) {
    let crew: Crew;
    try {
      crew = await this.crewService
        .query()
        .byCrew({ crewSf })
        .withTeam()
        .withLogs()
        .withShared()
        .getOneOrFail();
    } catch (err) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    if (
      crew.guild.guildSf !== auth.aud &&
      crew.shared.findIndex((shared) => shared.guild.guildSf === auth.aud) === -1
    ) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    const logs = crew.logs;

    if (!logs.length) {
      return [];
    } else {
      logs.forEach((log) => {
        log.guild = crew.guild;
        log.crew = crew;
      });

      crew.logs = null;
      crew.guild = null;
    }

    return logs;
  }
}
