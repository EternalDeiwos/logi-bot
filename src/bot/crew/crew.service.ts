import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from 'src/config';
import { Crew } from './crew.entity';
import { CrewMember } from './crew-member.entity';

@Injectable()
export class CrewService {
  private readonly logger = new Logger(CrewService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Crew) private readonly crewRepo: Repository<Crew>,
    @InjectRepository(CrewMember) private readonly memberRepo: Repository<CrewMember>,
  ) {}
}
