import { Injectable, UseFilters } from '@nestjs/common';
import { DiscordExceptionFilter } from 'src/bot/bot-exception.filter';
import { EchoCommand } from 'src/core/echo.command-group';

@Injectable()
@EchoCommand({
  name: 'access',
  description: 'Manage access rules',
})
@UseFilters(DiscordExceptionFilter)
export class AccessCommand {}
