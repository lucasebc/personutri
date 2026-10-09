process.env.DATABASE_PATH = ':memory:';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup';

const TOKEN_A = 'tokenA-0123456789abcdef';
const TOKEN_B = 'tokenB-0123456789abcdef';

async function boot(): Promise<INestApplication> {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = setupApp(mod.createNestApplication());
  await app.init();
  return app;
}

describe('autenticação por token (e2e)', () => {
  const saved = { tokens: process.env.API_TOKENS, env: process.env.NODE_ENV };
  afterEach(() => {
    if (saved.tokens === undefined) delete process.env.API_TOKENS;
    else process.env.API_TOKENS = saved.tokens;
    (process.env as Record<string, string | undefined>).NODE_ENV = saved.env;
  });

  describe('com tokens configurados', () => {
    let app: INestApplication;
    beforeAll(async () => {
      process.env.API_TOKENS = `${TOKEN_A}, ${TOKEN_B}`;
      app = await boot();
    });
    afterAll(() => app.close());
    const http = () => request(app.getHttpServer());

    it('/health é público e informa que exige token', async () => {
      const r = await http().get('/api/health').expect(200);
      expect(r.body).toMatchObject({ status: 'ok', authRequired: true });
    });

    it('recusa sem token, com esquema errado e com token errado', async () => {
      await http().get('/api/dashboard').expect(401);
      await http().get('/api/dashboard').set('Authorization', TOKEN_A).expect(401);
      await http().get('/api/dashboard').set('Authorization', 'Bearer errado-errado-errado').expect(401);
      await http().post('/api/foods').send({ name: 'Intruso', kcal: 1, protein: 0, carbs: 0, fat: 0 }).expect(401);
    });

    it('aceita qualquer dos tokens configurados', async () => {
      await http().get('/api/dashboard').set('Authorization', `Bearer ${TOKEN_A}`).expect(200);
      await http().get('/api/dashboard').set('Authorization', `bearer ${TOKEN_B}`).expect(200);
      const r = await http().get('/api/auth/check').set('Authorization', `Bearer ${TOKEN_A}`).expect(200);
      expect(r.body).toEqual({ ok: true });
    });
  });

  it('após muitas tentativas inválidas bloqueia o IP temporariamente (429)', async () => {
    process.env.API_TOKENS = TOKEN_A;
    const app = await boot();
    try {
      for (let i = 0; i < 20; i++) await request(app.getHttpServer()).get('/api/dashboard').set('Authorization', 'Bearer x-x-x-x-x').expect(401);
      await request(app.getHttpServer()).get('/api/dashboard').set('Authorization', 'Bearer x-x-x-x-x').expect(429);
      // mesmo o token correto fica bloqueado durante a janela
      await request(app.getHttpServer()).get('/api/dashboard').set('Authorization', `Bearer ${TOKEN_A}`).expect(429);
    } finally {
      await app.close();
    }
  });

  it('sem tokens fora de produção a API fica aberta e informa isso', async () => {
    delete process.env.API_TOKENS;
    const app = await boot();
    try {
      const r = await request(app.getHttpServer()).get('/api/health').expect(200);
      expect(r.body.authRequired).toBe(false);
      await request(app.getHttpServer()).get('/api/dashboard').expect(200);
    } finally {
      await app.close();
    }
  });

  it('recusa subir em produção sem tokens', async () => {
    delete process.env.API_TOKENS;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    await expect(boot()).rejects.toThrow(/API_TOKENS/);
  });

  it('recusa tokens curtos demais', async () => {
    process.env.API_TOKENS = 'curto';
    await expect(boot()).rejects.toThrow(/16 caracteres/);
  });
});
