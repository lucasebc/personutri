process.env.DATABASE_PATH = ':memory:';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { todayInTz } from '../src/common/dates';
import { setupApp } from '../src/setup';

describe('API para o app: idempotência e importações (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const today = todayInTz();
  let walkId: number;

  beforeAll(async () => {
    delete process.env.API_TOKENS;
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(mod.createNestApplication());
    await app.init();
    const acts = (await http().get('/api/activities')).body;
    walkId = acts.find((a: { name: string }) => a.name === 'Caminhada').id;
    await http().put('/api/body/profile').send({ sex: 'male', birthDate: '1990-01-10', heightCm: 180, activityLevel: 'light', activityMode: 'tracked', currentWeightKg: 80 }).expect(200);
  });
  afterAll(() => app.close());

  describe('Idempotency-Key', () => {
    const body = () => ({ date: today, time: '10:00', activityId: walkId, durationMin: 30, distanceKm: 2.5 });

    it('repetir a mesma chave devolve a mesma resposta e não duplica', async () => {
      const a = await http().post('/api/workouts').set('Idempotency-Key', 'op-1').send(body()).expect(201);
      const b = await http().post('/api/workouts').set('Idempotency-Key', 'op-1').send(body()).expect(201);
      expect(b.body.id).toBe(a.body.id);
      const day = (await http().get('/api/workouts').query({ date: today })).body;
      expect(day.workouts).toHaveLength(1);
    });

    it('sem chave cada requisição cria um registro', async () => {
      await http().post('/api/workouts').send(body()).expect(201);
      const day = (await http().get('/api/workouts').query({ date: today })).body;
      expect(day.workouts).toHaveLength(2);
    });

    it('a mesma chave em outra rota é recusada', async () => {
      await http().post('/api/body/weights').set('Idempotency-Key', 'op-1').send({ date: today, weightKg: 80 }).expect(422);
    });

    it('erro não consome a chave: dá para corrigir e reenviar', async () => {
      await http().post('/api/workouts').set('Idempotency-Key', 'op-2').send({ ...body(), durationMin: 0 }).expect(400);
      await http().post('/api/workouts').set('Idempotency-Key', 'op-2').send(body()).expect(201);
    });

    it('vale também para DELETE (reenvio não falha nem apaga outro)', async () => {
      const w = (await http().post('/api/workouts').set('Idempotency-Key', 'op-3').send(body()).expect(201)).body;
      await http().delete(`/api/workouts/${w.id}`).set('Idempotency-Key', 'op-4').expect(204);
      await http().delete(`/api/workouts/${w.id}`).set('Idempotency-Key', 'op-4').expect(204);
    });
  });

  describe('POST /workouts/import (Health Connect)', () => {
    const base = { date: today, time: '07:00', durationMin: 40 };

    it('mapeia o tipo do Health Connect para o catálogo e calcula pelo peso', async () => {
      const r = await http()
        .post('/api/workouts/import')
        .send({ items: [{ ...base, externalId: 'hc-run', exerciseType: 'RUNNING', distanceKm: 6, avgHeartRate: 150, title: 'Corrida matinal' }] })
        .expect(200);
      expect(r.body).toEqual({ created: 1, updated: 0, deleted: 0, errors: [] });
      const w = (await http().get('/api/workouts').query({ date: today })).body.workouts.find((x: { source: string }) => x.source === 'device');
      expect(w.activity.name).toBe('Corrida');
      expect(w.speedKmh).toBe(9);
      expect(w.kcalSource).toBe('calculated');
      expect(w.notes).toBe('Corrida matinal');
    });

    it('reimportar atualiza (calorias do relógio passam a valer) sem duplicar', async () => {
      const r = await http()
        .post('/api/workouts/import')
        .send({ items: [{ ...base, externalId: 'hc-run', exerciseType: 'RUNNING', distanceKm: 6, deviceActiveKcal: 410 }] })
        .expect(200);
      expect(r.body).toMatchObject({ created: 0, updated: 1 });
      const dev = (await http().get('/api/workouts').query({ date: today })).body.workouts.filter((x: { source: string }) => x.source === 'device');
      expect(dev).toHaveLength(1);
      expect(dev[0]).toMatchObject({ netKcal: 410, kcalSource: 'device' });
    });

    it('tipo desconhecido, ou por velocidade sem dados, cai na atividade genérica', async () => {
      await http()
        .post('/api/workouts/import')
        .send({
          items: [
            { ...base, externalId: 'hc-para', exerciseType: 'PARAGLIDING', deviceActiveKcal: 120 },
            { ...base, externalId: 'hc-walk', exerciseType: 'WALKING' },
          ],
        })
        .expect(200);
      const ws = (await http().get('/api/workouts').query({ date: today })).body.workouts;
      expect(ws.find((x: { activity: { name: string } }) => x.activity.name === 'Outra atividade')).toBeDefined();
      expect(ws.filter((x: { activity: { name: string } }) => x.activity.name === 'Outra atividade')).toHaveLength(2);
    });

    it('apaga o que foi removido na origem e reporta itens inválidos', async () => {
      const r = await http()
        .post('/api/workouts/import')
        .send({ items: [{ ...base, externalId: 'hc-bad', activityId: 999999 }], deletedExternalIds: ['hc-para', 'inexistente'] })
        .expect(200);
      expect(r.body.deleted).toBe(1);
      expect(r.body.errors).toHaveLength(1);
      const ws = (await http().get('/api/workouts').query({ date: today })).body.workouts;
      expect(ws.filter((x: { activity: { name: string } }) => x.activity.name === 'Outra atividade')).toHaveLength(1);
    });

    it('não toca em treinos manuais ao apagar por externalId', async () => {
      const before = (await http().get('/api/workouts').query({ date: today })).body.workouts.filter((x: { source: string }) => x.source === 'manual').length;
      await http().post('/api/workouts/import').send({ items: [], deletedExternalIds: ['op-1'] }).expect(200);
      const after = (await http().get('/api/workouts').query({ date: today })).body.workouts.filter((x: { source: string }) => x.source === 'manual').length;
      expect(after).toBe(before);
    });
  });

  describe('POST /body/weights/import', () => {
    it('importa pesagens, atualiza as do dispositivo e preserva as manuais', async () => {
      const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
      const d2 = new Date(Date.parse(`${today}T00:00:00Z`) - 2 * 86_400_000).toISOString().slice(0, 10);
      await http().post('/api/body/weights').send({ date: yesterday, weightKg: 80.5 }).expect(201); // manual
      const first = (await http().post('/api/body/weights/import').send({ items: [{ date: yesterday, weightKg: 79 }, { date: d2, weightKg: 80.8, bodyFatPct: 21 }] }).expect(200)).body;
      expect(first).toEqual({ created: 1, updated: 0, skippedManual: 1 });
      const again = (await http().post('/api/body/weights/import').send({ items: [{ date: d2, weightKg: 80.6 }] }).expect(200)).body;
      expect(again).toEqual({ created: 0, updated: 1, skippedManual: 0 });
      const ws = (await http().get('/api/body/weights')).body;
      expect(ws.find((x: { date: string }) => x.date === yesterday).weightKg).toBe(80.5);
      expect(ws.find((x: { date: string }) => x.date === d2).weightKg).toBe(80.6);
    });
  });
});
