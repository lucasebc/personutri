'use client';

import { useEffect, useState } from 'react';
import { api, del, Food, FoodSearch, MicroKey, post } from '@/lib/api';
import { fmt } from '@/lib/format';
import { MICRO_INFO, MICRO_KEYS } from '@/lib/micros';
import { FoodRow } from '@/components/FoodPicker';
import { Card, ErrorBox, Modal, PageHeader, SourceBadge } from '@/components/ui';

function FoodDetail({ food, onClose, onDeleted }: { food: Food; onClose: () => void; onDeleted: () => void }) {
  const micros = MICRO_KEYS.filter((k) => food.micros[k] !== undefined);
  return (
    <Modal title={food.name} onClose={onClose}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <SourceBadge source={food.source} />
        {food.brand && <span>{food.brand}</span>}
        {food.category && <span>{food.category}</span>}
        {food.barcode && <span className="num">EAN {food.barcode}</span>}
      </div>
      <p className="mb-2 text-xs text-muted">Valores por 100 g</p>
      <dl className="num grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
        {[
          ['Calorias', `${fmt(food.kcal)} kcal`],
          ['Proteínas', `${fmt(food.protein, 1)} g`],
          ['Carboidratos', `${fmt(food.carbs, 1)} g`],
          ['Gorduras', `${fmt(food.fat, 1)} g`],
          ['Fibras', `${fmt(food.fiber, 1)} g`],
          ...micros.map((k) => [MICRO_INFO[k].label, `${fmt(food.micros[k]!, food.micros[k]! < 5 ? 2 : 1)} ${MICRO_INFO[k].unit}`]),
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 border-b border-line py-1">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {micros.length === 0 && <p className="mt-3 text-xs text-muted">Sem micronutrientes cadastrados para este alimento.</p>}
      {food.source === 'custom' && (
        <div className="mt-4 flex justify-end">
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (!confirm('Remover este alimento?')) return;
              try {
                await del(`/foods/${food.id}`);
                onDeleted();
              } catch (e) {
                alert((e as Error).message);
              }
            }}
          >
            Remover alimento
          </button>
        </div>
      )}
    </Modal>
  );
}

const MICRO_FORM_KEYS: MicroKey[] = ['sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'zinc', 'vitaminC', 'vitaminA', 'sugars', 'saturatedFat'];

function NewFoodModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '', servingGrams: '', servingLabel: '' });
  const [micros, setMicros] = useState<Partial<Record<MicroKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));

  async function save() {
    setSaving(true);
    const m: Record<string, number> = {};
    for (const [key, v] of Object.entries(micros)) {
      const n = num(v ?? '');
      if (n !== undefined && Number.isFinite(n)) m[key] = n;
    }
    try {
      await post('/foods', {
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        kcal: num(form.kcal) ?? 0,
        protein: num(form.protein) ?? 0,
        carbs: num(form.carbs) ?? 0,
        fat: num(form.fat) ?? 0,
        fiber: num(form.fiber),
        servingGrams: num(form.servingGrams),
        servingLabel: form.servingLabel.trim() || undefined,
        micros: m,
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  const field = (label: string, k: keyof typeof form, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      <span>{label}</span>
      <input value={form[k]} onChange={set(k)} inputMode={props.type === 'text' ? undefined : 'decimal'} {...props} />
    </label>
  );

  return (
    <Modal title="Novo alimento" onClose={onClose}>
      <p className="mb-3 text-xs text-muted">Informe os valores por 100 g (ou 100 ml), como no rótulo.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {field('Nome', 'name', { type: 'text', placeholder: 'Ex.: Pão da padaria', autoFocus: true })}
        {field('Marca (opcional)', 'brand', { type: 'text' })}
        {field('Calorias (kcal)', 'kcal')}
        {field('Proteínas (g)', 'protein')}
        {field('Carboidratos (g)', 'carbs')}
        {field('Gorduras (g)', 'fat')}
        {field('Fibras (g)', 'fiber')}
        {field('Porção (g)', 'servingGrams')}
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-accent">Micronutrientes (opcional)</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MICRO_FORM_KEYS.map((k) => (
            <label key={k} className="field">
              <span>
                {MICRO_INFO[k].label} ({MICRO_INFO[k].unit})
              </span>
              <input inputMode="decimal" value={micros[k] ?? ''} onChange={(e) => setMicros({ ...micros, [k]: e.target.value })} />
            </label>
          ))}
        </div>
      </details>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={saving || form.name.trim().length < 2 || form.kcal.trim() === ''} onClick={save}>
          Salvar
        </button>
      </div>
    </Modal>
  );
}

export default function FoodsPage() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'local' | 'off'>('local');
  const [result, setResult] = useState<FoodSearch>({ foods: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Food | null>(null);
  const [creating, setCreating] = useState(false);
  const [version, setVersion] = useState(0);

  const term = q.trim();
  const isBarcode = /^\d{8,14}$/.test(term);

  async function search(source: 'local' | 'off' | 'all') {
    if (term.length < 2) {
      setResult({ foods: [] });
      return;
    }
    setLoading(true);
    try {
      setResult(await api<FoodSearch>(`/foods/search?source=${source}&limit=40&q=${encodeURIComponent(term)}`));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== 'local' || isBarcode) return;
    const t = setTimeout(() => void search('local'), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, tab, version]);

  return (
    <>
      <PageHeader title="Alimentos" subtitle="TACO (alimentos brasileiros genéricos) e Open Food Facts (produtos de mercado, por nome ou código de barras).">
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + Novo alimento
        </button>
      </PageHeader>

      <Card>
        <div className="mb-3 flex gap-2">
          {(
            [
              ['local', 'Meus e TACO'],
              ['off', 'Produtos (Open Food Facts)'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setResult({ foods: [] });
              }}
              className={`btn btn-sm ${tab === id ? 'btn-primary' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (tab === 'off' || isBarcode) void search(tab === 'off' && !isBarcode ? 'off' : 'all');
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'local' ? 'Buscar alimento…' : 'Nome do produto ou código de barras (EAN)'} aria-label="Buscar alimento" />
          {(tab === 'off' || isBarcode) && <button className="btn btn-primary shrink-0">Buscar</button>}
        </form>

        {error && <div className="mt-3"><ErrorBox message={error} /></div>}
        {result.offError && <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{result.offError}</p>}
        {loading && <p className="py-6 text-center text-sm text-muted">Buscando…</p>}
        <div className="mt-4 flex flex-col gap-2">
          {result.foods.map((f) => (
            <FoodRow key={f.id} food={f} onClick={() => setSelected(f)} />
          ))}
        </div>
        {!loading && result.foods.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            {term.length < 2 ? 'Digite para buscar. A base TACO tem 591 alimentos brasileiros com micronutrientes.' : 'Nada encontrado.'}
          </p>
        )}
      </Card>

      {selected && (
        <FoodDetail
          food={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            setVersion((v) => v + 1);
          }}
        />
      )}
      {creating && (
        <NewFoodModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
