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
import { CounterService } from './counter.service';
import { InsertCounterAccessDto } from './dto/insert-counter-access.dto';

@ApiTags('counter')
@ApiBearerAuth()
@Controller('rpc')
@UseGuards(AuthGuard)
export class CounterRpcController {
  private readonly logger = new Logger(CounterRpcController.name);

  constructor(private readonly counterService: CounterService) {}

  @Post('/counter.grant_access')
  @ApiBody({ type: InsertCounterAccessDto, description: 'Configuration' })
  async grantCounterAccess(@Auth() auth: APITokenPayload, @Body() body: InsertCounterAccessDto) {
    const counter = await this.counterService
      .query()
      .withGuild()
      .byGuild({ guildSf: auth.aud })
      .byCounter({ id: body.counterId })
      .getCount();

    if (counter !== 1) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    await this.counterService.grantAccess({ ...body, createdBy: auth.sub });
  }
}
