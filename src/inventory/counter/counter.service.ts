import { Injectable, Logger } from '@nestjs/common';
import { DeleteResult, InsertResult, UpdateResult } from 'typeorm';
import { Snowflake } from 'discord.js';
import { WarService } from 'src/game/war/war.service';
import { InsertCounterAccessDto } from './dto/insert-counter-access.dto';
import { InsertCounterEntryDto } from './dto/insert-counter-entry.dto';
import { InsertCounterDto } from './dto/insert-counter.dto';
import { SelectCounterDto } from './dto/select-counter.dto';
import { SelectCounterAccess } from './counter-access.entity';
import { CounterQueryBuilder } from './counter.query';
import { CounterEntryQueryBuilder } from './counter-entry.query';
import { CounterRepository, CurrentCounterRepository } from './counter.repository';
import { CounterEntryRepository } from './counter-entry.repository';
import { CounterAccessRepository } from './counter-access.repository';
import { CrewService } from 'src/core/crew/crew.service';

export abstract class CounterService {
  abstract query(): CounterQueryBuilder;
  abstract queryEntries(): CounterEntryQueryBuilder;
  abstract registerCounter(data: InsertCounterDto): Promise<InsertResult>;
  abstract updateCounter(data: InsertCounterEntryDto[]): Promise<InsertResult>;
  abstract grantAccess(data: InsertCounterAccessDto): Promise<InsertResult>;
  abstract revokeAccess(
    accessRef: SelectCounterAccess | SelectCounterAccess[],
  ): Promise<UpdateResult>;
  abstract deleteCounter(
    logRef: SelectCounterDto | SelectCounterDto[],
    deletedBy: Snowflake,
  ): Promise<DeleteResult>;
}

@Injectable()
export class CounterServiceImpl extends CounterService {
  private readonly logger = new Logger(CounterService.name);

  constructor(
    private readonly warService: WarService,
    private readonly crewService: CrewService,
    private readonly counterRepo: CounterRepository,
    private readonly currentCounterRepo: CurrentCounterRepository,
    private readonly entryRepo: CounterEntryRepository,
    private readonly accessRepo: CounterAccessRepository,
  ) {
    super();
  }

  query() {
    return new CounterQueryBuilder(this.currentCounterRepo, this.warService.query().byCurrent());
  }

  queryEntries() {
    return new CounterEntryQueryBuilder(this.entryRepo);
  }

  async registerCounter(data: InsertCounterDto) {
    const war = await this.warService.query().byCurrent().getOneOrFail();
    const crew = await this.crewService.query().byCrew({ id: data.crewId }).getOneOrFail();
    const counter = this.counterRepo.create({ ...data, warNumber: war.warNumber });
    const result = await this.counterRepo.insert(counter);

    if (result?.identifiers) {
      const [{ id }] = result.identifiers as SelectCounterAccess[];
      const rule = await this.crewService.getOrCreateDefaultCrewAccessRule(crew);
      await this.grantAccess({
        counterId: id,
        createdBy: counter.createdBy,
        ruleId: rule.id,
      });
    }

    return result;
  }

  async updateCounter(data: InsertCounterEntryDto[]) {
    return await this.entryRepo.insert(data);
  }

  async grantAccess(data: InsertCounterAccessDto) {
    return await this.accessRepo.insert(data);
  }

  async revokeAccess(accessRef: SelectCounterAccess | SelectCounterAccess[]) {
    if (!Array.isArray(accessRef)) {
      accessRef = [accessRef];
    }

    return await this.accessRepo
      .createQueryBuilder('access')
      .update()
      .set({ deletedAt: new Date() })
      .where('access.id IN (:...access)', { access: accessRef.map((a) => a.id) })
      .execute();
  }

  async deleteCounter(counterRef: SelectCounterDto | SelectCounterDto[], deletedBy: Snowflake) {
    if (!Array.isArray(counterRef)) {
      counterRef = [counterRef];
    }

    return await this.counterRepo
      .createQueryBuilder('counter')
      .update()
      .set({ deletedAt: new Date(), deletedBy })
      .where('counter.id IN (:...counters)', { counters: counterRef.map((s) => s.id) })
      .execute();
  }
}
