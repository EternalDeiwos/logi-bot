import { Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { ExpandedCatalog } from './catalog.entity';

export class CatalogQueryBuilder extends CommonQueryBuilder<ExpandedCatalog> {
  constructor(
    repo: Repository<ExpandedCatalog>,
    private readonly gameVersion: string,
    private readonly catalogVersion: string,
  ) {
    super(repo, 'catalog');
    this.qb.andWhere(
      'catalog.foxhole_version=:gameVersion AND catalog.catalog_version=:catalogVersion',
      { gameVersion, catalogVersion },
    );
  }

  byCodeName(codeName: string | string[]) {
    if (!Array.isArray(codeName)) {
      codeName = [codeName];
    }

    this.qb.andWhere('catalog.code_name IN (:...codeName)', { codeName });

    return this;
  }
}
