import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Catalog, ExpandedCatalog } from './catalog.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CatalogRepository extends Repository<Catalog> {
  constructor(private readonly dataSource: DataSource) {
    super(Catalog, dataSource.createEntityManager());
  }
}

@Injectable()
export class ExpandedCatalogRepository extends Repository<ExpandedCatalog> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    super(ExpandedCatalog, dataSource.createEntityManager());
  }

  getCurrent() {
    return this.find({
      where: {
        catalogVersion: this.configService.getOrThrow('APP_CATALOG_VERSION'),
        gameVersion: this.configService.getOrThrow('APP_FOXHOLE_VERSION'),
      },
    });
  }
}
