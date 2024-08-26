import { Injectable, Logger } from '@nestjs/common';
import { DeltaCommand } from 'src/inventory/inventory.command-group';
import { StockpileService } from './stockpile.service';

@Injectable()
@DeltaCommand({
  name: 'stockpile',
  description: 'Stockpile',
})
export class StockpileCommand {
  private readonly logger = new Logger(StockpileCommand.name);

  constructor(private readonly stockpileService: StockpileService) {}
}
