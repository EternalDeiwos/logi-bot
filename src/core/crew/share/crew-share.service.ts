import { Injectable, Logger } from '@nestjs/common';
import { InsertResult } from 'typeorm';
import { CrewShareRepository } from './crew-share.repository';
import { InsertCrewShare } from './crew-share.entity';

export abstract class CrewShareService {
  abstract shareCrew(share: InsertCrewShare): Promise<InsertResult>;
}

@Injectable()
export class CrewShareServiceImpl extends CrewShareService {
  private readonly logger = new Logger(CrewShareService.name);

  constructor(private readonly shareRepo: CrewShareRepository) {
    super();
  }

  async shareCrew(share: InsertCrewShare) {
    return await this.shareRepo.upsert(share, ['guildId', 'crewSf']);
  }
}
