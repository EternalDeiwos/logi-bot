import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { CatalogCategory, CatalogCategoryNameMap, ExpandedCatalog } from './catalog.entity';

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

  byCategory(categories: CatalogCategory | CatalogCategory[]) {
    if (!Array.isArray(categories)) {
      categories = [categories];
    }

    this.qb.andWhere('catalog.category IN (:...categories)', { categories: categories });
    return this;
  }

  search(query: string) {
    const q = query.toLowerCase();
    const categories = Object.entries(CatalogCategoryNameMap)
      .filter(([category, description]) => {
        return category.toLowerCase().includes(q) || description.toLowerCase().includes(q);
      })
      .map(([c]) => c) as CatalogCategory[];

    this.qb.andWhere(
      new Brackets((qb) =>
        qb
          .where(`${this.alias}.display_name ILIKE :query`)
          .orWhere(`${this.alias}.category IN (:...categories)`),
      ),
      { query: `%${q}%`, categories },
    );

    return this;
  }
}
