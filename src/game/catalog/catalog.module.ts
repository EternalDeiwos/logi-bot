import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Catalog, ExpandedCatalog } from './catalog.entity';
import { CatalogRepository, ExpandedCatalogRepository } from './catalog.repository';
import { CatalogService } from './catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([Catalog, ExpandedCatalog])],
  providers: [CatalogRepository, ExpandedCatalogRepository, CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
