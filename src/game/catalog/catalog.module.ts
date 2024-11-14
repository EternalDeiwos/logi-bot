import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Catalog, ExpandedCatalog } from './catalog.entity';
import { CatalogRepository, ExpandedCatalogRepository } from './catalog.repository';
import { CatalogService, CatalogServiceImpl } from './catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([Catalog, ExpandedCatalog])],
  providers: [
    CatalogRepository,
    ExpandedCatalogRepository,
    { provide: CatalogService, useClass: CatalogServiceImpl },
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
