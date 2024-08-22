import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StockpileService {
  private readonly logger = new Logger(StockpileService.name);

  constructor() {}
}
