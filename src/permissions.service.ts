import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PermissionsBitField } from 'discord.js';
import { Config, ConfigService } from 'src/config';

@Injectable()
export class PermissionsService implements OnModuleInit {
  private readonly logger: Logger = new Logger(PermissionsService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const permissions = this.getPermissions();
    for (const name of permissions.toArray()) {
      this.logger.debug(`Added permission ${name}`);
    }
    this.logger.log(`Permissions: ${permissions.valueOf()}`);
  }

  getPermissions(): PermissionsBitField {
    const permissions = this.configService.get<bigint>(
      Config.DISCORD_BOT_PERMISSIONS,
    );
    return new PermissionsBitField(permissions);
  }
}
