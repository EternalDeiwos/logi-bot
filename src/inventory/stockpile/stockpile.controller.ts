import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiParam,
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
import { Stockpile } from './stockpile.entity';
import { InsertStockpileLogDto } from './dto/insert-stockpile-log.dto';
import { SelectStockpileLog } from './stockpile-log.entity';

@ApiTags('stockpile')
@ApiBearerAuth()
@Controller('stockpile')
@UseGuards(AuthGuard)
export class StockpileController {
  private readonly logger = new Logger(StockpileController.name);

  constructor(
    private readonly rmq: AmqpConnection,
    private readonly configService: ConfigService,
    private readonly guildService: GuildService,
    private readonly stockpileService: StockpileService,
  ) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Get a list of stockpiles', type: [Stockpile] })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  async getStockpiles(@Auth() auth: APITokenPayload) {
    return this.stockpileService
      .query()
      .withGuild()
      .withPoi()
      .withAccessRules()
      .byGuild({ guildSf: auth.aud })
      .getMany();
  }

  @Get(':stockpile')
  @ApiParam({ name: 'stockpile', description: 'Stockpile id', required: true })
  @ApiResponse({ status: 200, description: 'Get a specific stockpile', type: Stockpile })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getStockpile(@Auth() auth: APITokenPayload, @Param('stockpile') id: string) {
    return this.stockpileService
      .query()
      .withGuild()
      .withPoi()
      .withEntries()
      .withAccessRules()
      .withoutNilEntries()
      .withCatalog()
      .byGuild({ guildSf: auth.aud })
      .byStockpile({ id })
      .getOneOrFail();
  }

  @Post('/log')
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
      const [{ id }] = result.identifiers as SelectStockpileLog[];

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
}
