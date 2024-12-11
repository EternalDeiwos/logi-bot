import { Controller, Get, Redirect, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Expose } from 'class-transformer';
import { Response } from 'express';
import { ConfigKey } from 'src/app.config';
import { Auth } from 'src/core/api/auth.decorator';
import { APITokenPayload } from 'src/core/api/api.service';
import { PermissionsService } from './permissions.service';

import * as pkg from '../package.json';

export class ApplicationInformation {
  @ApiProperty({ example: pkg.name })
  @Expose()
  name: string;

  @ApiProperty({ example: pkg.version, deprecated: true })
  @Expose()
  version: string;

  @ApiProperty({ example: pkg.version })
  @Expose()
  app_version: string;

  @ApiProperty({ example: 'naval-58' })
  @Expose()
  foxhole_version: string;

  @ApiProperty({ example: 'v2' })
  @Expose()
  catalog_version: string;

  @ApiProperty({ example: 'naval-58/v2' })
  @Expose()
  foxhole_catalog_version: string;

  @ApiProperty({
    example:
      'https://discord.com/api/oauth2/authorize?client_id=1234567890&permissions=1234567890&scope=bot',
  })
  @Expose()
  invite_link: string;

  @ApiProperty({
    example: '/api',
  })
  @Expose()
  swagger_endpoint_path: string;

  @ApiProperty({
    example: '/api-json',
  })
  @Expose()
  openapi_uri_path: string;

  static from(data: ApplicationInformation) {
    return Object.assign(new ApplicationInformation(), data);
  }
}

@ApiTags('info')
@Controller({ version: VERSION_NEUTRAL })
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
  })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  getInfo(@Auth() auth: APITokenPayload): ApplicationInformation {
    const scope = this.configService.getOrThrow<string>('DISCORD_BOT_SCOPE');
    const foxhole_version = this.configService.getOrThrow<string>('APP_FOXHOLE_VERSION');
    const catalog_version = this.configService.getOrThrow<string>('APP_CATALOG_VERSION');
    const client_id = this.configService.getOrThrow<string>('DISCORD_BOT_CLIENT_ID');
    const permissions = this.permissions.getPermissions();
    const invite_link = `https://discord.com/api/oauth2/authorize?client_id=${client_id}&permissions=${permissions.valueOf()}&scope=${encodeURIComponent(scope)}`;

    return ApplicationInformation.from({
      name: pkg.name,
      version: pkg.version,
      app_version: pkg.version,
      foxhole_version,
      catalog_version,
      foxhole_catalog_version: `${foxhole_version}/${catalog_version}`,
      invite_link,
      swagger_endpoint_path: '/api',
      openapi_uri_path: '/api-json',
    });
  }

  @Get('invite')
  @Redirect('https://discord.com/api/oauth2/authorize', 303)
  inviteBot(@Res() res: Response) {
    const scope = this.configService.getOrThrow<string>('DISCORD_BOT_SCOPE');
    const client_id = this.configService.getOrThrow<string>('DISCORD_BOT_CLIENT_ID');
    const permissions = this.permissions.getPermissions();
    const params = `client_id=${client_id}&permissions=${permissions.valueOf()}&scope=${encodeURIComponent(scope)}`;
    return res.redirect(303, `https://discord.com/api/oauth2/authorize?${params}`);
  }
}
