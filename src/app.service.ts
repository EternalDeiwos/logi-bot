import { Injectable, Logger } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly permissions: PermissionsService,
  ) {}

  inviteUrl() {
    const scope = this.configService.getOrThrow<string>('DISCORD_BOT_SCOPE');
    const client_id = this.configService.getOrThrow<string>('DISCORD_BOT_CLIENT_ID');
    const permissions = this.permissions.getPermissions();
    return `https://discord.com/api/oauth2/authorize?client_id=${client_id}&permissions=${permissions.valueOf()}&scope=${encodeURIComponent(scope)}`;
  }
}
