import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ServerModule } from 'src/app.module';
import { ApiService } from 'src/core/api/api.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let apiKey: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ServerModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const apiService: ApiService = await app.get(ApiService);
    apiKey = await apiService.makeApiKey({
      aud: '0123456789',
      sub: '0123456789',
      iat: Date.now(),
    });
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .set({ authorization: `Bearer ${apiKey}` })
      .expect((res) => res.status === 200 && JSON.parse(res.text));
  });
});
