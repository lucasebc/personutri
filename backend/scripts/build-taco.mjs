#!/usr/bin/env node
/**
 * Converte o CSV normalizado da TACO (4ª edição, NEPA/UNICAMP) para o JSON
 * embutido no backend (src/foods/data/taco.json).
 *
 * Fonte dos CSVs (licença MIT): https://github.com/brolesi/taco
 *   data/processed/taco/taco_composicao.csv
 *
 * Uso: node scripts/build-taco.mjs <caminho/taco_composicao.csv>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const input = process.argv[2];
if (!input) {
  console.error('Uso: node scripts/build-taco.mjs <taco_composicao.csv>');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const [header, ...lines] = parseCsv(readFileSync(input, 'utf8'));
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

// "Tr" (traço) vem do pipeline como 1e-5: tratamos como zero.
const num = (row, key) => {
  const raw = row[idx[key]];
  if (raw === undefined || raw === '') return null;
  const v = Number(raw);
  if (!Number.isFinite(v)) return null;
  return v <= 1e-4 ? 0 : Math.round(v * 1000) / 1000;
};

// chave interna do micronutriente -> coluna do CSV
const MICROS = {
  cholesterol: 'colesterol_mg',
  sodium: 'sodio_mg',
  potassium: 'potassio_mg',
  calcium: 'calcio_mg',
  magnesium: 'magnesio_mg',
  phosphorus: 'fosforo_mg',
  iron: 'ferro_mg',
  zinc: 'zinco_mg',
  copper: 'cobre_mg',
  manganese: 'manganes_mg',
  vitaminC: 'vitamina_c_mg',
  vitaminA: 'RAE_mcg',
  thiamin: 'tiamina_mg',
  riboflavin: 'riboflavina_mg',
  vitaminB6: 'piridoxina_mg',
  niacin: 'niacina_mg',
};

const foods = [];
for (const row of lines) {
  const kcal = num(row, 'energia_kcal');
  if (kcal === null) continue; // sem energia não serve para cálculo
  const micros = {};
  for (const [key, col] of Object.entries(MICROS)) {
    const v = num(row, col);
    if (v !== null) micros[key] = v;
  }
  // cobre vem em mg na TACO; mantemos mg.
  foods.push({
    id: row[idx.numero_alimento],
    name: row[idx.descricao],
    category: row[idx.categoria],
    kcal: Math.round(kcal * 10) / 10,
    protein: num(row, 'proteina_g') ?? 0,
    carbs: num(row, 'carboidrato_g') ?? 0,
    fat: num(row, 'lipideos_g') ?? 0,
    fiber: num(row, 'fibra_g'),
    micros,
  });
}

const out = join(dirname(fileURLToPath(import.meta.url)), '../src/foods/data/taco.json');
writeFileSync(out, JSON.stringify(foods));
console.log(`${foods.length} alimentos escritos em ${out}`);
