import { ApiProperty } from '@nestjs/swagger';
import { APITokenPayload } from 'src/core/api/api-token.dto';

export class ApplicationInformationDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  version: string;

  @ApiProperty()
  invite_link: string;

  @ApiProperty()
  auth: APITokenPayload;
}
