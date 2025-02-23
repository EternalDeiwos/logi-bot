import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AuthGuard } from 'src/core/api/auth.guard';
import { Auth } from 'src/core/api/auth.decorator';
import { APITokenPayload } from 'src/core/api/api.service';
import { GuildService } from 'src/core/guild/guild.service';
import { CurrentCounter, InsertCounterDto } from './counter.entity';
import { InsertCounterEntryDto } from './counter-entry.entity';
import { CounterService } from './counter.service';

@ApiTags('counter')
@ApiBearerAuth()
@Controller('counter')
@UseGuards(AuthGuard)
export class CounterController {
  private readonly logger = new Logger(CounterController.name);

  constructor(
    private readonly rmq: AmqpConnection,
    private readonly configService: ConfigService,
    private readonly guildService: GuildService,
    private readonly counterService: CounterService,
  ) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Get a list of counters', type: [CurrentCounter] })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  async getCounters(@Auth() auth: APITokenPayload) {
    return this.counterService
      .query()
      .withGuild()
      .withCatalog()
      .forCurrentWar()
      .byGuild({ guildSf: auth.aud })
      .getMany();
  }

  @Get(':counter')
  @ApiParam({ name: 'counter', description: 'Counter id', required: true })
  @ApiResponse({ status: 200, description: 'Get a specific counter', type: CurrentCounter })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getCounter(@Auth() auth: APITokenPayload, @Param('counter') id: string) {
    const counter = await this.counterService
      .query()
      .withGuild()
      .withEntries()
      .withAccessRules()
      .withCatalog()
      .withCrew()
      .byGuild({ guildSf: auth.aud })
      .forCurrentWar()
      .byCounter({ id })
      .getOne();

    if (!counter) {
      this.logger.warn(`No counter ${id} found for guild ${auth.aud}`);
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    return counter;
  }

  @Delete(':counter')
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteCounter(@Auth() auth: APITokenPayload, @Param('counter') counterId: string) {
    const counter = await this.counterService
      .query()
      .withDeleted()
      .withGuild()
      .byGuild({ guildSf: auth.aud })
      .byCounter({ id: counterId })
      .getOne();

    if (!counter) {
      this.logger.warn(`No counter ${counterId} found for guild ${auth.aud}`);
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    await this.counterService.deleteCounter({ id: counterId }, auth.sub);
  }

  @Post()
  @ApiBody({ type: InsertCounterDto, description: 'Counter configuration' })
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createCounter(@Auth() auth: APITokenPayload, @Body() data: InsertCounterDto) {
    const guild = await this.guildService.query().byGuild({ guildSf: auth.aud }).getOneOrFail();
    await this.counterService.registerCounter({
      createdBy: auth.sub,
      guildId: guild.id,
      ...data,
    });
  }

  @Post(':counter')
  @ApiBody({ type: InsertCounterEntryDto, description: 'Counter configuration' })
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateCounter(
    @Auth() auth: APITokenPayload,
    @Param('counter') counter: string,
    @Body() data: InsertCounterEntryDto,
  ) {
    const updates = [
      {
        createdBy: auth.sub,
        counterId: counter,
        ...data,
      },
    ];
    await this.counterService.updateCounter(updates);

    const expiration = this.configService.getOrThrow<number>('APP_QUEUE_RPC_EXPIRE');

    await this.rmq.publish(
      'counter',
      'counter.update',
      {
        updates,
        interaction: {
          guildId: auth.aud,
          user: auth.sub,
        },
      },
      {
        expiration,
      },
    );
  }
}
