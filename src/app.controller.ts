import { Controller, Get } from '@nestjs/common';
import { Config, ConfigService } from 'src/config';
import { PermissionsService } from './permissions.service';

import * as pkg from '../package.json';

export type ApplicationInformation = {
  name: string;
  version: string;
  invite_link: string;
};

@Controller()
export class AppController {
  constructor(
    private configService: ConfigService,
    private permissions: PermissionsService,
  ) {}

  @Get()
  getInfo(): ApplicationInformation {
    const scope = this.configService.getOrThrow<string>(
      Config.DISCORD_BOT_SCOPE,
    );
    const client_id = this.configService.getOrThrow<string>(
      Config.DISCORD_BOT_CLIENT_ID,
    );
    const permissions = this.permissions.getPermissions();
    const invite_link = `https://discord.com/api/oauth2/authorize?client_id=${client_id}&permissions=${permissions.valueOf()}&scope=${encodeURIComponent(scope)}`;

    return {
      name: pkg.name,
      version: pkg.version,
      invite_link,
    };
  }
}
