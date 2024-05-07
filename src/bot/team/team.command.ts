import { Injectable, Logger } from '@nestjs/common';
import { StringOption } from 'necord';
import { EchoCommand } from 'src/bot/echo.command-group';
import { ConfigService } from 'src/config';
import { TeamService } from './team.service';

export class CreateTeamCommandParams {
  @StringOption({
    name: 'name',
    description: 'Your team name',
    required: true,
  })
  name: string;
}

@Injectable()
@EchoCommand({
  name: 'team',
  description: 'Manage teams',
})
export class TeamCommand {
  private readonly logger = new Logger(TeamCommand.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly teamService: TeamService,
  ) {}
}
