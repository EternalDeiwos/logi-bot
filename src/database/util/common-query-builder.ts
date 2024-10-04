import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

export abstract class CommonQueryBuilder<Entity extends ObjectLiteral> {
  protected readonly qb: SelectQueryBuilder<Entity>;

  constructor(
    private readonly repo: Repository<Entity>,
    protected readonly alias: string,
  ) {
    this.qb = repo.createQueryBuilder(alias);
  }

  withDeleted() {
    this.qb.withDeleted();
    return this;
  }

  getMany() {
    return this.qb.getMany();
  }

  getOneOrFail() {
    return this.qb.getOneOrFail();
  }

  getOne() {
    return this.qb.getOne();
  }

  exists() {
    return this.qb.getExists();
  }
}
