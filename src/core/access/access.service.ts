import { Injectable } from '@nestjs/common';
import { InsertResult } from 'typeorm';
import { AccessEntryQueryBuilder } from './access.query';
import { AccessEntryRepository } from './access.repository';
import { InsertAccessEntry } from './access.entity';

export abstract class AccessService {
  abstract query(): AccessEntryQueryBuilder;
  abstract createRule(data: InsertAccessEntry): Promise<InsertResult>;
}

@Injectable()
export class AccessServiceImpl extends AccessService {
  constructor(private readonly accessRepo: AccessEntryRepository) {
    super();
  }

  query() {
    return new AccessEntryQueryBuilder(this.accessRepo);
  }

  async createRule(data: InsertAccessEntry) {
    return await this.accessRepo.insert(data);
  }
}
