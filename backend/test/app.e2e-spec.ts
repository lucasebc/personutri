process.env.DATABASE_PATH = ':memory:';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { todayInTz } from '../src/common/dates';
import { OffClient, OffUnavailableError } from '../src/foods/off.client';
import { setupApp } from '../src/setup';

const offProduct = {
  externalId: '7891000100103',
  barcode: '7891000100103',
  name: 'Leite condensado Moça',
  brand: 'Nestlé',
  category: 'Leites condensados',
  kcal: 321,
  protein: 7.3,
  carbs: 55,
  fat: 8,
  fiber: 0,
  micros: { sodium: 100, calcium: 250 },
  servingGrams: 20,
  servingLabel: '20 g',
};

describe('PersoNutri API (e2e)', () => {
  let app: INestApplication;
  const off = { search: jest.fn(), byBarcode: jest.fn() };
  const http = () => request(app.getHttpServer());
  const today = todayInTz();

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(OffClient).useValue(off).compile();
    app = setupApp(mod.createNestApplication());
    await app.init();
  });
  afterAll(() => app.close());

  let arrozId: number;
  let feijaoId: number;
  let mealId: number;
  let dietId: number;

  describe('alimentos', () => {
    it('carrega a TACO e busca ignorando acentos e ordem das palavras', async () => {
      const r = await http().get('/api/foods/search').query({ q: 'arroz integral', source: 'local' }).expect(200);
      expect(r.body.foods.length).toBeGreaterThan(0);
      const cozido = r.body.foods.find((f: any) => f.name === 'Arroz, integral, cozido');
      expect(cozido).toMatchObject({ source: 'taco', kcal: expect.any(Number) });
      arrozId = cozido.id;

      const r2 = await http().get('/api/foods/search').query({ q: 'feijao preto', source: 'local' }).expect(200);
      feijaoId = r2.body.foods.find((f: any) => f.name === 'Feijão, preto, cozido').id;
      expect(feijaoId).toBeDefined();
    });

    it('busca no Open Food Facts e guarda os produtos', async () => {
      off.search.mockResolvedValueOnce([offProduct]);
      const r = await http().get('/api/foods/search').query({ q: 'leite condensado', source: 'off' }).expect(200);
      expect(r.body.foods).toHaveLength(1);
      expect(r.body.foods[0]).toMatchObject({ source: 'off', barcode: '7891000100103', brand: 'Nestlé' });
      // aparece depois na busca local
      const local = await http().get('/api/foods/search').query({ q: 'condensado', source: 'all' }).expect(200);
      expect(local.body.foods.some((f: any) => f.barcode === '7891000100103')).toBe(true);
    });

    it('não duplica produto ao buscar de novo', async () => {
      off.search.mockResolvedValueOnce([{ ...offProduct, kcal: 330 }]);
      await http().get('/api/foods/search').query({ q: 'leite condensado', source: 'off' }).expect(200);
      const r = await http().get('/api/foods/search').query({ q: 'condensado', source: 'local' }).expect(200);
      expect(r.body.foods.filter((f: any) => f.barcode === '7891000100103')).toHaveLength(1);
    });

    it('degrada com aviso quando o OFF está fora do ar', async () => {
      off.search.mockRejectedValueOnce(new OffUnavailableError('fora do ar'));
      const r = await http().get('/api/foods/search').query({ q: 'arroz', source: 'off' }).expect(200);
      expect(r.body.offError).toBe('fora do ar');
    });

    it('busca por código de barras', async () => {
      off.byBarcode.mockResolvedValueOnce({ ...offProduct, externalId: '7894900011517', barcode: '7894900011517', name: 'Coca-Cola' });
      const r = await http().get('/api/foods/barcode/7894900011517').expect(200);
      expect(r.body.name).toBe('Coca-Cola');
      // 2ª vez vem do banco, sem chamar o OFF
      await http().get('/api/foods/barcode/7894900011517').expect(200);
      expect(off.byBarcode).toHaveBeenCalledTimes(1);
      off.byBarcode.mockResolvedValueOnce(null);
      await http().get('/api/foods/barcode/7890000000000').expect(404);
    });

    it('cadastra, edita e remove alimento próprio; não edita o da TACO', async () => {
      const created = await http()
        .post('/api/foods')
        .send({ name: 'Whey caseiro', kcal: 400, protein: 80, carbs: 8, fat: 6, micros: { calcium: 500, bogus: 9 } })
        .expect(201);
      expect(created.body.source).toBe('custom');
      expect(created.body.micros).toEqual({ calcium: 500 });
      await http().patch(`/api/foods/${created.body.id}`).send({ kcal: 410 }).expect(200);
      await http().patch(`/api/foods/${arrozId}`).send({ kcal: 1 }).expect(400);
      await http().delete(`/api/foods/${created.body.id}`).expect(204);
      await http().post('/api/foods').send({ name: 'x', kcal: -1 }).expect(400);
    });
  });

  describe('refeições e dietas', () => {
    it('cria refeição e calcula totais', async () => {
      const r = await http()
        .post('/api/meals')
        .send({ name: 'Almoço padrão', items: [{ foodId: arrozId, grams: 200 }, { foodId: feijaoId, grams: 100 }] })
        .expect(201);
      mealId = r.body.id;
      expect(r.body.items).toHaveLength(2);
      const arroz = (await http().get(`/api/foods/${arrozId}`)).body;
      const feijao = (await http().get(`/api/foods/${feijaoId}`)).body;
      expect(r.body.totals.kcal).toBe(Math.round(arroz.kcal * 2 + feijao.kcal));
      expect(r.body.totals.micros.iron).toBeGreaterThan(0);
    });

    it('valida refeição vazia ou com alimento inexistente', async () => {
      await http().post('/api/meals').send({ name: 'Vazia', items: [] }).expect(400);
      await http().post('/api/meals').send({ name: 'Fantasma', items: [{ foodId: 999999, grams: 10 }] }).expect(400);
    });

    it('atualiza itens da refeição', async () => {
      const r = await http()
        .put(`/api/meals/${mealId}`)
        .send({ name: 'Almoço padrão', items: [{ foodId: arrozId, grams: 150 }, { foodId: feijaoId, grams: 100 }] })
        .expect(200);
      expect(r.body.items.find((i: any) => i.foodId === arrozId).grams).toBe(150);
    });

    it('cria dieta (a primeira fica ativa) com a refeição todos os dias', async () => {
      const r = await http()
        .post('/api/diets')
        .send({ name: 'Cutting', entries: [{ mealId, label: 'Almoço', time: '12:30', weekdays: [0, 1, 2, 3, 4, 5, 6] }] })
        .expect(201);
      dietId = r.body.id;
      expect(r.body.active).toBe(true);
      expect(r.body.byWeekday).toHaveLength(7);
      expect(r.body.averageKcal).toBeGreaterThan(0);
    });

    it('rejeita horário inválido e não apaga refeição usada em dieta', async () => {
      await http().post('/api/diets').send({ name: 'Ruim', entries: [{ mealId, label: 'x', time: '25:00', weekdays: [1] }] }).expect(400);
      await http().delete(`/api/meals/${mealId}`).expect(400);
    });
  });

  describe('perfil, diário, dashboard e previsão', () => {
    it('dashboard sem perfil ainda mostra consumo, sem metas', async () => {
      const r = await http().get('/api/dashboard').expect(200);
      expect(r.body.hasProfile).toBe(false);
      expect(r.body.targets).toBeNull();
      expect(r.body.balance).toBeNull();
      expect(r.body.meals).toHaveLength(1);
    });

    it('previsão pede perfil primeiro', async () => {
      const r = await http().get('/api/forecast/weekly').expect(200);
      expect(r.body).toEqual({ ready: false, reason: 'no-profile' });
    });

    it('salva o perfil corporal com peso atual', async () => {
      const r = await http()
        .put('/api/body/profile')
        .send({ sex: 'male', birthDate: '1990-01-10', heightCm: 180, activityLevel: 'moderate', weeklyGoalKg: -0.5, currentWeightKg: 82 })
        .expect(200);
      expect(r.body.profile.heightCm).toBe(180);
      expect(r.body.weights).toHaveLength(1);
      expect(r.body.energy.tdee).toBeGreaterThan(2500);
      expect(r.body.energy.targetKcal).toBe(r.body.energy.tdee - 550);
    });

    it('valida perfil', async () => {
      await http().put('/api/body/profile').send({ sex: 'x', birthDate: '1990-01-10', heightCm: 180, activityLevel: 'moderate' }).expect(400);
      await http().put('/api/body/profile').send({ sex: 'male', birthDate: '2999-01-10', heightCm: 180, activityLevel: 'moderate' }).expect(400);
    });

    let entryId: number;
    it('gera a agenda do dia a partir da dieta ativa', async () => {
      const r = await http().get(`/api/diary/${today}`).expect(200);
      expect(r.body.entries).toHaveLength(1);
      expect(r.body.entries[0]).toMatchObject({ kind: 'planned', status: 'pending', label: 'Almoço', time: '12:30' });
      entryId = r.body.entries[0].id;
      // idempotente
      const again = await http().get(`/api/diary/${today}`).expect(200);
      expect(again.body.entries).toHaveLength(1);
    });

    it('pendente não conta como consumido; marcar como feita conta', async () => {
      let d = (await http().get('/api/dashboard')).body;
      expect(d.consumed.kcal).toBe(0);
      expect(d.pending.kcal).toBeGreaterThan(0);
      expect(d.balance.status).toBe('deficit');

      await http().patch(`/api/diary/entries/${entryId}`).send({ status: 'done' }).expect(200);
      d = (await http().get('/api/dashboard')).body;
      const meal = (await http().get(`/api/meals/${mealId}`)).body;
      expect(d.consumed.kcal).toBe(meal.totals.kcal);
      expect(d.pending.kcal).toBe(0);
      expect(d.mealsDone).toBe(1);
      expect(d.consumed.micros.iron).toBeGreaterThan(0);
      expect(d.micros.find((m: any) => m.key === 'iron').pct).toBeGreaterThan(0);
      expect(d.balance.vsTdee).toBe(d.consumed.kcal - d.energy.tdee);
      expect(d.remainingKcal).toBe(d.targets.kcal - d.consumed.kcal);
    });

    it('permite ajustar quantidades de uma refeição programada', async () => {
      await http().patch(`/api/diary/entries/${entryId}`).send({ items: [{ foodId: arrozId, grams: 300 }] }).expect(200);
      const d = (await http().get(`/api/diary/${today}`)).body;
      expect(d.entries[0].items).toHaveLength(1);
      expect(d.entries[0].items[0].grams).toBe(300);
    });

    it('adiciona consumo livre, que entra nos totais; programada não pode ser apagada', async () => {
      const before = (await http().get('/api/dashboard')).body.consumed.kcal;
      const r = await http().post(`/api/diary/${today}/free`).send({ label: 'Lanche', time: '16:00', items: [{ foodId: arrozId, grams: 100 }] }).expect(201);
      expect(r.body).toMatchObject({ kind: 'free', status: 'done', label: 'Lanche' });
      const after = (await http().get('/api/dashboard')).body.consumed.kcal;
      expect(after).toBeGreaterThan(before);
      await http().delete(`/api/diary/entries/${entryId}`).expect(400);
      await http().delete(`/api/diary/entries/${r.body.id}`).expect(204);
      expect((await http().get('/api/dashboard')).body.consumed.kcal).toBe(before);
    });

    it('pular a refeição a tira dos totais e das pendências', async () => {
      await http().patch(`/api/diary/entries/${entryId}`).send({ status: 'skipped' }).expect(200);
      const d = (await http().get('/api/dashboard')).body;
      expect(d.consumed.kcal).toBe(0);
      expect(d.pending.kcal).toBe(0);
      expect(d.mealsTotal).toBe(0);
    });

    it('trocar a dieta remove pendências obsoletas', async () => {
      const other = await http().post('/api/diets').send({ name: 'Vazia', entries: [] }).expect(201);
      await http().post(`/api/diets/${other.body.id}/activate`).expect(201);
      const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
      expect((await http().get(`/api/diary/${tomorrow}`)).body.entries).toHaveLength(0);
      await http().post(`/api/diets/${dietId}/activate`).expect(201);
      expect((await http().get(`/api/diary/${tomorrow}`)).body.entries).toHaveLength(1);
    });

    it('registra pesagens e entrega a previsão semanal', async () => {
      const r = await http().post('/api/body/weights').send({ date: today, weightKg: 81.4, bodyFatPct: 20 }).expect(201);
      expect(r.body.weights).toHaveLength(1); // mesma data: atualiza
      expect(r.body.latestWeight.weightKg).toBe(81.4);
      await http().post('/api/body/weights').send({ date: '2999-01-01', weightKg: 80 }).expect(400);

      const f = (await http().get('/api/forecast/weekly')).body;
      expect(f.ready).toBe(true);
      expect(f.weeks.length).toBeGreaterThan(0);
      expect(f.projection).toHaveLength(4);
      expect(f.projection[0].predicted).toBeLessThan(81.4);
    });

    it('valida data do diário', async () => {
      await http().get('/api/diary/2026-13-45').expect(400);
    });
  });
});
