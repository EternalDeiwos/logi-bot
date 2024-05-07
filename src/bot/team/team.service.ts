import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from 'src/config';
import { Team } from './team.entity';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
  ) {}
}
