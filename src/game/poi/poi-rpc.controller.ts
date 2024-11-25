import { Controller, Post, HttpCode, Logger, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/core/api/auth.guard';
import { Auth } from 'src/core/api/auth.decorator';
import { APITokenPayload } from 'src/core/api/api.service';
import { PoiService } from './poi.service';

@ApiTags('poi')
@ApiBearerAuth()
@Controller('rpc')
@UseGuards(AuthGuard)
export class PoiRpcController {
  private readonly logger = new Logger(PoiRpcController.name);

  constructor(private readonly poiService: PoiService) {}

  @Post('/poi.reload')
  @HttpCode(202)
  @ApiResponse({ status: 202, description: 'Accepted' }, { overrideExisting: true })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  async resetLocations(@Auth() auth: APITokenPayload) {
    try {
      await this.poiService.populatePoi();
    } catch (err) {
      this.logger.error(err, err.stack);
    }
  }
}
