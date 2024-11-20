import { Injectable } from '@nestjs/common';
import { AccessEntryQueryBuilder } from './access.query';
import { AccessEntryRepository } from './access.repository';

export abstract class AccessService {
  abstract query(): AccessEntryQueryBuilder;
}

@Injectable()
export class AccessServiceImpl extends AccessService {
  constructor(private readonly accessRepo: AccessEntryRepository) {
    super();
  }

  query() {
    return new AccessEntryQueryBuilder(this.accessRepo);
  }
}
