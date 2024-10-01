import { Controller, Get, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Expose } from 'class-transformer';
import { ConfigKey } from 'src/app.config';
import { AuthGuard } from 'src/core/api/auth.guard';
import { Auth } from 'src/core/api/auth.decorator';
import { APITokenPayload } from 'src/core/api/api.service';
import { PermissionsService } from './permissions.service';

import * as pkg from '../package.json';

export class ApplicationInformation {
  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  version: string;

  @ApiProperty()
  @Expose()
  invite_link: string;

  @ApiProperty()
  @Expose()
  auth: APITokenPayload;

  static from(data: ApplicationInformation) {
    return Object.assign(new ApplicationInformation(), data);
  }
}

@ApiTags('info')
@ApiBearerAuth()
@Controller({ version: VERSION_NEUTRAL })
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
    type: ApplicationInformation,
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
  getInfo(@Auth() auth: APITokenPayload): ApplicationInformation {
    const scope = this.configService.getOrThrow<string>('DISCORD_BOT_SCOPE');
    const client_id = this.configService.getOrThrow<string>('DISCORD_BOT_CLIENT_ID');
    const permissions = this.permissions.getPermissions();
    const invite_link = `https://discord.com/api/oauth2/authorize?client_id=${client_id}&permissions=${permissions.valueOf()}&scope=${encodeURIComponent(scope)}`;

    return ApplicationInformation.from({
      name: pkg.name,
      version: pkg.version,
      invite_link,
      auth: APITokenPayload.from(auth),
    });
  }
}
