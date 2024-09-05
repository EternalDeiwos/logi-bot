import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class MigrationKillSwitch implements OnModuleInit {
  private readonly logger = new Logger(MigrationKillSwitch.name, { timestamp: true });

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    if (await this.dataSource.showMigrations()) {
      this.logger.debug('Detected pending database migrations');

      if (this.configService.getOrThrow<string>('NODE_ENV') === 'production') {
        this.logger.fatal(
          'Please run database migrations',
          'Halting application to prevent data corruption',
        );

        return process.exit(1);
      } else {
        this.logger.warn(
          'Database migrations ignored',
          'Using the application without current migrations may cause data corruption',
        );
      }
    } else {
      this.logger.log('Database schema is up to date');
    }
  }
}
