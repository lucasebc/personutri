#!/usr/bin/env node
/**
 * Popula a API com dados de demonstração: refeições, uma dieta ativa, perfil corporal,
 * ~5 semanas de pesagens e de diário. Usa só a API HTTP (o backend precisa estar rodando).
 *
 *   SEED_TOKEN=<token> node scripts/seed-demo.mjs [http://localhost:3001/api]
 */
const API = process.argv[2] || process.env.API_URL || 'http://localhost:3001/api';
// Token da API (se ela exigir): SEED_TOKEN=... node scripts/seed-demo.mjs
const TOKEN = process.env.SEED_TOKEN || process.env.API_TOKEN || '';

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const dayStr = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function food(term) {
  const { foods } = await call('GET', `/foods/search?source=local&limit=1&q=${encodeURIComponent(term)}`);
  if (!foods.length) throw new Error(`Alimento não encontrado: ${term}`);
  return foods[0];
}

const existing = await call('GET', '/meals');
if (existing.length) {
  console.log('Já existem refeições cadastradas; nada a fazer.');
  process.exit(0);
}

const f = {
  pao: await food('pão francês'),
  ovo: await food('ovo galinha inteiro cozido'),
  banana: await food('banana prata crua'),
  arroz: await food('arroz tipo 1 cozido'),
  feijao: await food('feijão carioca cozido'),
  frango: await food('frango peito sem pele grelhado'),
  alface: await food('alface crespa crua'),
  iogurte: await food('iogurte natural'),
  maca: await food('maçã fuji'),
  batata: await food('batata doce cozida'),
  carne: await food('carne bovina patinho grelhado'),
};

// Porções ajustadas para uma dieta de ~2.250 kcal/dia (déficit moderado para o perfil abaixo).
const SCALE = 1.65;
const meal = (name, items) =>
  call('POST', '/meals', { name, items: items.map(([k, grams]) => ({ foodId: f[k].id, grams: Math.round((grams * SCALE) / 5) * 5 })) });
const cafe = await meal('Café da manhã', [['pao', 50], ['ovo', 100], ['banana', 100]]);
const almoco = await meal('Almoço padrão', [['arroz', 150], ['feijao', 100], ['frango', 120], ['alface', 40]]);
const lanche = await meal('Lanche da tarde', [['iogurte', 170], ['maca', 130]]);
const jantar = await meal('Jantar leve', [['batata', 150], ['carne', 110], ['alface', 40]]);

const all = [0, 1, 2, 3, 4, 5, 6];
await call('POST', '/diets', {
  name: 'Cutting — semana normal',
  entries: [
    { mealId: cafe.id, label: 'Café da manhã', time: '07:30', weekdays: all },
    { mealId: almoco.id, label: 'Almoço', time: '12:30', weekdays: all },
    { mealId: lanche.id, label: 'Lanche da tarde', time: '16:00', weekdays: all },
    { mealId: jantar.id, label: 'Jantar', time: '20:00', weekdays: all },
  ],
});

await call('PUT', '/body/profile', {
  sex: 'male',
  birthDate: '1992-04-18',
  heightCm: 178,
  activityLevel: 'light', // dia a dia; os treinos entram à parte (modo "tracked")
  activityMode: 'tracked',
  weeklyGoalKg: -0.5,
  targetWeightKg: 76,
  currentWeightKg: 84.2,
  weightDate: dayStr(-35),
});

const [lift] = await call('GET', `/activities?q=${encodeURIComponent('musculacao intensa')}`);
const [walk] = await call('GET', '/activities?q=caminhada').then((l) => l.filter((a) => a.name === 'Caminhada'));

// ~5 semanas de histórico determinístico: a maioria dos dias segue o plano, alguns pulam o lanche
// e há consumos livres. As pesagens oscilam em torno de uma perda de ~0,4 kg/semana.
const snack = f.banana;
for (let off = -35; off <= 0; off++) {
  const date = dayStr(off);
  const { entries } = await call('GET', `/diary/${date}`);
  for (const e of entries) {
    const skipSnack = e.label === 'Lanche da tarde' && off % 4 === 0;
    const pending = off === 0 && e.time > '13:00'; // hoje: só o que já passou
    if (pending) continue;
    await call('PATCH', `/diary/entries/${e.id}`, { status: skipSnack ? 'skipped' : 'done' });
  }
  // Treinos: musculação seg/qua/sex, caminhada ter/sáb
  const wd = new Date(`${date}T12:00:00`).getDay();
  if ([1, 3, 5].includes(wd)) await call('POST', '/workouts', { date, time: '18:00', activityId: lift.id, durationMin: 60, avgHeartRate: 128 });
  if ([2, 6].includes(wd)) await call('POST', '/workouts', { date, time: '07:00', activityId: walk.id, durationMin: 45, distanceKm: 4.1 });
  if (off % 3 === 0 && off < 0) {
    await call('POST', `/diary/${date}/free`, { label: 'Beliscos', time: '22:00', items: [{ foodId: snack.id, grams: 100 }] });
  }
  if (off % 2 === 0 || off === 0) {
    const trend = 84.2 - ((off + 35) * 0.4) / 7;
    const noise = [0.3, -0.2, 0.1, -0.35, 0.25, -0.1, 0.05][Math.abs(off) % 7];
    await call('POST', '/body/weights', { date, weightKg: Math.round((trend + noise) * 10) / 10, bodyFatPct: off % 14 === 0 ? 21 : undefined });
  }
}
console.log('Dados de demonstração criados.');
