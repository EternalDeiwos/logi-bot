import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseError } from 'src/errors';
import { CatalogRepository, ExpandedCatalogRepository } from './catalog.repository';
import { Catalog } from './catalog.entity';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly catalogRepo: CatalogRepository,
    private readonly currentCatalogRepo: ExpandedCatalogRepository,
  ) {}

  getDefaultCatalogUri(gameVersion: string) {
    return `https://raw.githubusercontent.com/GICodeWarrior/fir/main/foxhole/${gameVersion}/catalog.json`;
  }

  async countCurrent() {
    const gameVersion = await this.configService.getOrThrow('APP_FOXHOLE_VERSION');
    const catalogVersion = await this.configService.getOrThrow('APP_CATALOG_VERSION');

    try {
      return await this.currentCatalogRepo.count({ where: { gameVersion, catalogVersion } });
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to get current catalog', err);
    }
  }

  async getCurrent() {
    const gameVersion = await this.configService.getOrThrow('APP_FOXHOLE_VERSION');
    const catalogVersion = await this.configService.getOrThrow('APP_CATALOG_VERSION');

    try {
      return await this.currentCatalogRepo.find({ where: { gameVersion, catalogVersion } });
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to get current catalog', err);
    }
  }

  private async fetchCatalog(
    uri: string,
    gameVersion: string,
    catalogVersion: string,
  ): Promise<Catalog[]> {
    try {
      const response = await fetch(uri);
      const data: any[] = await response.json();

      return data.map((entry) =>
        this.catalogRepo.create({
          name: entry['CodeName'],
          gameVersion,
          catalogVersion,
          data: entry,
          createdAt: new Date(),
        }),
      );
    } catch (err) {
      throw new BaseError('EXTERNAL_ERROR', 'Failed to fetch catalog', err);
    }
  }

  async updateCatalog(uri: string, gameVersion: string, catalogVersion: string) {
    const data = await this.fetchCatalog(uri, gameVersion, catalogVersion);

    try {
      const result = await this.catalogRepo.upsert(data, ['gameVersion', 'catalogVersion', 'name']);
      const count = result?.identifiers?.length;
      this.logger.log(`Added ${count} to catalog from ${gameVersion}/${catalogVersion}`);

      return count;
    } catch (err) {
      throw new BaseError('QUERY_FAILED', 'Failed to update catalog', err);
    }
  }

  updateDefaultCatalog(catalogVersion: string) {
    const gameVersion = this.configService.getOrThrow('APP_FOXHOLE_VERSION');
    const uri = this.getDefaultCatalogUri(gameVersion);
    return this.updateCatalog(uri, gameVersion, catalogVersion);
  }
}
