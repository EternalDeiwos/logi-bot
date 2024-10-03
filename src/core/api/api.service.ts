import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { createHash } from 'crypto';
import { CompactSign } from 'jose';

export class APITokenPayload {
  @ApiProperty()
  @Expose()
  aud: string;

  @ApiProperty()
  @Expose()
  sub: string;

  @ApiProperty()
  @Expose()
  iat: number;

  static from(data: APITokenPayload) {
    return Object.assign(new APITokenPayload(), data);
  }
}

export abstract class ApiService {
  abstract getSigningKeys(): [string, Buffer][];
  abstract makeApiKey(payload: APITokenPayload): Promise<string>;
}

@Injectable()
export class ApiServiceImpl extends ApiService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ApiService.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  onApplicationBootstrap() {
    for (const [kid] of this.getSigningKeys()) {
      this.logger.log(`Active api-key kid: ${kid}`);
    }
  }

  getSigningKeys() {
    return this.configService
      .getOrThrow('APP_API_KEY_SECRET')
      .split(',')
      .map((keyText) => {
        const key = createHash('sha256').update(keyText.trim()).digest();
        const kid = createHash('sha256').update(key).digest().toString('base64url');
        return [kid, key];
      });
  }

  async makeApiKey(payload: APITokenPayload) {
    const [[kid, key]] = this.getSigningKeys();
    const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));
    return await new CompactSign(encodedPayload)
      .setProtectedHeader({ alg: 'HS256', kid })
      .sign(key);
  }
}
