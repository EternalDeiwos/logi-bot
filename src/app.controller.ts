import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/app.config';
import { AuthGuard } from 'src/core/api/auth.guard';
import { Auth } from 'src/core/api/auth.decorator';
import { APITokenPayload } from 'src/core/api/api-token.dto';
import { PermissionsService } from './permissions.service';
import { ApplicationInformationDto } from './app-info.dto';

import * as pkg from '../package.json';
@ApiTags('info')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard)
export class AppController {
  constructor(
    private configService: ConfigService<Record<ConfigKey, unknown>>,
    private permissions: PermissionsService,
  ) {}

  /**
   * Basic information about the service
   */
  @Get()
  @ApiResponse({
    status: 200,
    description: 'Diagnostic information for the service',
    type: ApplicationInformationDto,
    example: {
      name: pkg.name,
      version: pkg.version,
      invite_link:
        'https://discord.com/api/oauth2/authorize?client_id=1234567890&permissions=1234567890&scope=bot',
      auth: {
        aud: '1234567890',
        sub: '1234567890',
        iat: Date.now(),
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  getInfo(@Auth() auth: APITokenPayload): ApplicationInformationDto {
    const scope = this.configService.getOrThrow<string>('DISCORD_BOT_SCOPE');
    const client_id = this.configService.getOrThrow<string>('DISCORD_BOT_CLIENT_ID');
    const permissions = this.permissions.getPermissions();
    const invite_link = `https://discord.com/api/oauth2/authorize?client_id=${client_id}&permissions=${permissions.valueOf()}&scope=${encodeURIComponent(scope)}`;

    return {
      name: pkg.name,
      version: pkg.version,
      invite_link,
      auth,
    };
  }
}
