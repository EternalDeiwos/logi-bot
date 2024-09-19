import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { APITokenPayload } from 'src/types';
import { ConfigKey } from 'src/app.config';
import { AuthGuard } from 'src/core/api/auth.guard';
import { PermissionsService } from './permissions.service';

import * as pkg from '../package.json';

export type ApplicationInformation = {
  name: string;
  version: string;
  invite_link: string;
  auth: APITokenPayload;
};

@ApiTags('info')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard)
export class AppController {
  constructor(
    private configService: ConfigService<Record<ConfigKey, unknown>>,
    private permissions: PermissionsService,
  ) {}

  @Get()
  getInfo(@Request() req): ApplicationInformation {
    const { payload: auth } = req.auth;
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
