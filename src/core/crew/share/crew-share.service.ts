import { Injectable, Logger } from '@nestjs/common';
import { InsertResult } from 'typeorm';
import { CrewShareRepository } from './crew-share.repository';
import { InsertCrewShareDto } from './crew-share.entity';

export abstract class CrewShareService {
  abstract shareCrew(share: InsertCrewShareDto): Promise<InsertResult>;
}

@Injectable()
export class CrewShareServiceImpl extends CrewShareService {
  private readonly logger = new Logger(CrewShareService.name);

  constructor(private readonly shareRepo: CrewShareRepository) {
    super();
  }

  async shareCrew(share: InsertCrewShareDto) {
    return await this.shareRepo.upsert(share, ['guildId', 'crewId']);
  }
}
