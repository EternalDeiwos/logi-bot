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
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from 'src/core/api/auth.guard';
import { Auth } from 'src/core/api/auth.decorator';
import { GuildService } from 'src/core/guild/guild.service';
import { APITokenPayload } from 'src/core/api/api.service';
import { StockpileService } from './stockpile.service';
import { InsertStockpileLogDto } from './stockpile-log.entity';
import { SelectStockpileLogDto, StockpileLog } from './stockpile-log.entity';

@ApiTags('stockpile-log')
@ApiBearerAuth()
@Controller('stockpile-log')
@UseGuards(AuthGuard)
export class StockpileLogController {
  private readonly logger = new Logger(StockpileLogController.name);

  constructor(
    private readonly rmq: AmqpConnection,
    private readonly configService: ConfigService,
    private readonly guildService: GuildService,
    private readonly stockpileService: StockpileService,
  ) {}

  @Get()
  @ApiQuery({ name: 'limit', type: 'number', example: 20, required: false })
  @ApiQuery({ name: 'offset', type: 'number', example: 0, required: false })
  @ApiResponse({ status: 200, description: 'Get a list of recent logs', type: [StockpileLog] })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  async getLogs(
    @Auth() auth: APITokenPayload,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0',
  ) {
    return await this.stockpileService
      .queryLog()
      .withGuild()
      .withPoi()
      .withStockpiles()
      .withAccessRules()
      .withCrew()
      .byGuild({ guildSf: auth.aud })
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .getMany();
  }

  @Get(':log')
  @ApiParam({ name: 'log', description: 'Stockpile Log id', required: true })
  @ApiResponse({ status: 200, description: 'Get a list of recent logs', type: [StockpileLog] })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  async getLog(@Auth() auth: APITokenPayload, @Param('log') logId) {
    return await this.stockpileService
      .queryLog()
      .withGuild()
      .withPoi()
      .withStockpiles()
      .withAccessRules()
      .withCrew()
      .withDiff()
      .withDiffCatalog()
      .byGuild({ guildSf: auth.aud })
      .byLog({ id: logId })
      .getMany();
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: InsertStockpileLogDto, description: 'Stockpile log configuration' })
  @UseInterceptors(FileInterceptor('report'))
  @HttpCode(201)
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateStockpile(
    @Auth() auth: APITokenPayload,
    @Body() data: InsertStockpileLogDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: 'text/tab-separated-values' })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    report: Express.Multer.File,
  ) {
    const guild = await this.guildService.query().byGuild({ guildSf: auth.aud }).getOneOrFail();
    const result = await this.stockpileService.registerLog({
      createdBy: auth.sub,
      guildId: guild.id,
      raw: report.buffer.toString('utf8'),
      ...data,
    });

    if (result.identifiers.length) {
      const [{ id }] = result.identifiers as SelectStockpileLogDto[];

      const payload = {
        interaction: {
          guildId: auth.aud,
          member: auth.sub,
        },
        id,
      };

      const expiration = this.configService.getOrThrow<number>('APP_QUEUE_RPC_EXPIRE');

      await this.rmq.publish('stockpile', 'log.process', payload, {
        expiration,
      });
    }
  }

  @Delete(':log')
  @HttpCode(204)
  @ApiParam({ name: 'log', description: 'Stockpile Log id', required: true })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteStockpileLog(@Auth() auth: APITokenPayload, @Param('log') logId: string) {
    const log = await this.stockpileService
      .queryLog()
      .withDeleted()
      .withGuild()
      .byGuild({ guildSf: auth.aud })
      .byLog({ id: logId })
      .getOne();

    if (!log) {
      this.logger.warn(`No stockpile log ${logId} found for guild ${auth.aud}`);
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    if (log.deletedAt) {
      return;
    }

    await this.stockpileService.deleteLog({ id: logId }, auth.sub);
  }
}
