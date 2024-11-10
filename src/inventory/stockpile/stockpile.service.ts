import { Injectable, Logger } from '@nestjs/common';
import { ValidationError } from 'src/errors';
import { InsertStockpile } from './stockpile.entity';
import { StockpileRepository } from './stockpile.repository';
import { StockpileQueryBuilder } from './stockpile.query';
import { GuildService } from 'src/core/guild/guild.service';
import { WarService } from 'src/game/war/war.service';

export abstract class StockpileService {
  abstract query(): StockpileQueryBuilder;
  abstract registerStockpile(data: InsertStockpile): Promise<any>;
}

@Injectable()
export class StockpileServiceImpl extends StockpileService {
  private readonly logger = new Logger(StockpileService.name);

  constructor(
    private readonly guildService: GuildService,
    private readonly warService: WarService,
    private readonly stockpileRepo: StockpileRepository,
  ) {
    super();
  }

  query() {
    return new StockpileQueryBuilder(this.stockpileRepo);
  }

  async registerStockpile(data: InsertStockpile) {
    const guild = await this.guildService.query().byGuild({ id: data.guildId }).getOneOrFail();
    const war = await this.warService.getCurrent();

    if (data.name.length > 10) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Your name is too long to create a tag. Please try again with a `short_name` in your command that is under 20 characters.',
      ).asDisplayable();
    }

    if (await this.query().byLocation({ id: data.locationId }).search(data.name).getExists()) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        `A stockpile called ${data.name} is already registered at this location.`,
      ).asDisplayable();
    }

    const stockpile = this.stockpileRepo.create({ ...data, warNumber: war.warNumber });
    await this.stockpileRepo.insert(stockpile);
    stockpile.guild = guild;
    stockpile.war = war;

    return stockpile;
  }
}
