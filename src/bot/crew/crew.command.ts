import { Injectable, Logger } from '@nestjs/common';
import { StringOption } from 'necord';
import { ConfigService } from 'src/config';
import { EchoCommand } from 'src/bot/echo.command-group';
import { CrewService } from './crew.service';

export class CreateCrewCommandParams {
  @StringOption({
    name: 'name',
    description: 'Tag name',
    required: true,
  })
  name: string;
}

@Injectable()
@EchoCommand({
  name: 'crew',
  description: 'Manage crews',
})
export class CrewCommand {
  private readonly logger = new Logger(CrewCommand.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly crewService: CrewService,
  ) {}
}
