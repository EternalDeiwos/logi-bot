import { Controller, Get, Logger, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/core/api/auth.guard';
import { Auth } from 'src/core/api/auth.decorator';
import { APITokenPayload } from 'src/core/api/api.service';
import { StockpileService } from './stockpile.service';
import { Stockpile } from './stockpile.entity';

@ApiTags('stockpile')
@ApiBearerAuth()
@Controller('stockpile')
@UseGuards(AuthGuard)
export class StockpileController {
  private readonly logger = new Logger(StockpileController.name);

  constructor(private readonly stockpileService: StockpileService) {}

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
}
