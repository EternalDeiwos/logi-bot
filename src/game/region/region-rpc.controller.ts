import { Controller, Post, HttpCode, Logger, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/core/api/auth.guard';
import { Auth } from 'src/core/api/auth.decorator';
import { APITokenPayload } from 'src/core/api/api.service';
import { RegionService } from './region.service';

@ApiTags('region')
@ApiBearerAuth()
@Controller('rpc')
@UseGuards(AuthGuard)
export class RegionRpcController {
  private readonly logger = new Logger(RegionRpcController.name);

  constructor(private readonly regionService: RegionService) {}

  @Post('/region.reload')
  @HttpCode(202)
  @ApiResponse({ status: 202, description: 'Accepted' }, { overrideExisting: true })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  async resetLocations(@Auth() auth: APITokenPayload) {
    try {
      await this.regionService.updateRegions();
    } catch (err) {
      this.logger.error(err, err.stack);
    }
  }
}
