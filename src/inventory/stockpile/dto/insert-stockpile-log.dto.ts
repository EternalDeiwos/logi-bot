import { HttpStatus, ParseFilePipeBuilder, UploadedFile } from '@nestjs/common';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { StockpileLog } from 'src/inventory/stockpile/stockpile-log.entity';

export class InsertStockpileLogDto extends PickType(StockpileLog, [
  'crewSf',
  'locationId',
  'message',
] as const) {
  @ApiProperty({
    name: 'crewSf',
    description: 'Channel id of the responsible crew',
    type: 'string',
  })
  crewSf: string;

  @ApiProperty({
    name: 'report',
    description: 'Foxhole Inventory Report TSV',
    type: 'string',
    format: 'binary',
  })
  report: Express.Multer.File;
}
