import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectCatalog } from 'src/game/catalog/catalog.entity';
import { WarQueryBuilder } from 'src/game/war/war.query';
import { CounterKind, CurrentCounter, SelectCounterDto } from './counter.entity';

const searchWhere = (alias: string = 'counter') => {
  return new Brackets((qb) => qb.where(`${alias}.name ILIKE :query`));
};

export class CounterQueryBuilder extends CommonQueryBuilder<CurrentCounter> {
  constructor(
    repo: Repository<CurrentCounter>,
    private readonly currentWarQuery: WarQueryBuilder,
  ) {
    super(repo, 'counter');
  }

  byCounter(counterRef: SelectCounterDto | SelectCounterDto[]) {
    if (!Array.isArray(counterRef)) {
      counterRef = [counterRef];
    }

    this.qb.andWhere(`${this.alias}.id IN (:...counters)`, {
      counters: counterRef.map((c) => c.id),
    });

    return this;
  }

  byCatalog(catalogRef: SelectCatalog | SelectCatalog[]) {
    if (!Array.isArray(catalogRef)) {
      catalogRef = [catalogRef];
    }

    this.qb.andWhere('entry.catalog_id IN (:...catalogs)', {
      catalogs: catalogRef.map((c) => c.id),
    });

    return this;
  }

  byKind(kind: CounterKind | CounterKind[]) {
    if (!Array.isArray(kind)) {
      kind = [kind];
    }

    this.qb.andWhere(`entry.kind IN (:...kind)`, {
      kind,
    });

    return this;
  }

  search(query: string) {
    this.qb.andWhere(searchWhere(), { query: `%${query}%` });
    return this;
  }

  withGuild() {
    this.qb.leftJoinAndSelect('counter.guild', 'guild');
    return this;
  }

  withCrew() {
    this.qb.leftJoinAndSelect('counter.crew', 'crew');
    return this;
  }

  withEntries() {
    this.qb.leftJoinAndSelect('counter.items', 'entry');
    return this;
  }

  withCatalog() {
    this.qb.leftJoinAndSelect('counter.expandedCatalog', 'catalog');
    return this;
  }

  withAccessRules() {
    this.qb.leftJoinAndSelect('counter.access', 'access').leftJoinAndSelect('access.rule', 'rule');
    return this;
  }

  forCurrentWar() {
    this.qb
      .addCommonTableExpression(this.currentWarQuery.getQuery(), 'current_war')
      .innerJoin(
        () => this.qb.subQuery().addSelect('war_number').from('current_war', 'current_war'),
        'war',
        'war.war_number=counter.war_number',
      );
    return this;
  }

  order() {
    this.qb.addOrderBy('poi.major_name').addOrderBy('counter.name');
    return this;
  }
}
