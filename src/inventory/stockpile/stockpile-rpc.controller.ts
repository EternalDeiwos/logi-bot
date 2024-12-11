import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/core/api/auth.guard';
import { Auth } from 'src/core/api/auth.decorator';
import { APITokenPayload } from 'src/core/api/api.service';
import { StockpileService } from './stockpile.service';
import { InsertStockpileAccessDto } from './dto/insert-stockpile-access.dto';

@ApiTags('stockpile')
@ApiBearerAuth()
@Controller('rpc')
@UseGuards(AuthGuard)
export class StockpileRpcController {
  private readonly logger = new Logger(StockpileRpcController.name);

  constructor(private readonly stockpileService: StockpileService) {}

  @Post('/stockpile.grant_access')
  @ApiBody({ type: InsertStockpileAccessDto, description: 'Configuration' })
  async grantStockpileAccess(
    @Auth() auth: APITokenPayload,
    @Body() body: InsertStockpileAccessDto,
  ) {
    const stockpile = await this.stockpileService
      .query()
      .withGuild()
      .byGuild({ guildSf: auth.aud })
      .byStockpile({ id: body.stockpileId })
      .getCount();

    if (stockpile !== 1) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    await this.stockpileService.grantAccess({ ...body, createdBy: auth.sub });
  }
}
