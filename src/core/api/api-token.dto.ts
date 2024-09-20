import { ApiProperty } from '@nestjs/swagger';

export class APITokenPayload {
  @ApiProperty()
  aud: string;

  @ApiProperty()
  sub: string;

  @ApiProperty()
  iat: number;
}
