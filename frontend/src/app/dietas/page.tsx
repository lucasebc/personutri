'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, del, Diet, Meal, post, put } from '@/lib/api';
import { fmt, WEEKDAYS } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';
import { Card, Empty, ErrorBox, Loading, Modal, PageHeader } from '@/components/ui';

interface EntryDraft {
  key: number;
  id?: number;
  mealId: number | '';
  label: string;
  time: string;
  weekdays: number[];
}

let k = 0;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function DietEditor({ diet, meals, onClose, onSaved }: { diet: Diet | null; meals: Meal[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(diet?.name ?? '');
  const [entries, setEntries] = useState<EntryDraft[]>(
    diet?.entries.map((e) => ({ key: ++k, id: e.id, mealId: e.meal.id, label: e.label, time: e.time, weekdays: e.weekdays })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: number, patch: Partial<EntryDraft>) => setEntries(entries.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  const valid = name.trim().length >= 2 && entries.every((e) => e.mealId !== '' && e.label.trim() && e.time && e.weekdays.length > 0);

  async function save() {
    setSaving(true);
    const body = {
      name: name.trim(),
      entries: entries.map((e) => ({ id: e.id, mealId: e.mealId as number, label: e.label.trim(), time: e.time, weekdays: e.weekdays })),
    };
    try {
      if (diet) await put(`/diets/${diet.id}`, body);
      else await post('/diets', body);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={diet ? 'Editar dieta' : 'Nova dieta'} onClose={onClose} wide>
      <label className="field block">
        <span>Nome da dieta</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Cutting — semana normal" maxLength={80} autoFocus />
      </label>

      <h3 className="mt-5 mb-2 text-sm font-semibold text-muted uppercase">Refeições programadas</h3>
      {meals.length === 0 && (
        <p className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          Você ainda não tem refeições cadastradas. <Link href="/refeicoes" className="underline">Crie uma primeiro</Link>.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {entries.map((e) => (
          <li key={e.key} className="rounded-lg border border-line p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_7rem_auto]">
              <label className="field">
                <span>Nome no dia</span>
                <input value={e.label} onChange={(ev) => update(e.key, { label: ev.target.value })} placeholder="Café da manhã" maxLength={60} />
              </label>
              <label className="field">
                <span>Refeição</span>
                <select value={e.mealId} onChange={(ev) => update(e.key, { mealId: ev.target.value ? Number(ev.target.value) : '' })}>
                  <option value="">Escolher…</option>
                  {meals.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({fmt(m.totals.kcal)} kcal)
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Horário</span>
                <input type="time" value={e.time} onChange={(ev) => update(e.key, { time: ev.target.value })} />
              </label>
              <button className="btn btn-sm btn-danger self-end" onClick={() => setEntries(entries.filter((x) => x.key !== e.key))} aria-label="Remover refeição da dieta">
                ✕
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Dias da semana">
              {WEEKDAYS.map((w, i) => {
                const on = e.weekdays.includes(i);
                return (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update(e.key, { weekdays: on ? e.weekdays.filter((x) => x !== i) : [...e.weekdays, i].sort() })}
                    className={`btn btn-sm ${on ? 'btn-primary' : ''}`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <button className="btn mt-3" onClick={() => setEntries([...entries, { key: ++k, mealId: '', label: '', time: '12:00', weekdays: ALL_DAYS }])}>
        + Adicionar refeição à dieta
      </button>

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={!valid || saving} onClick={save}>
          Salvar
        </button>
      </div>
    </Modal>
  );
}

export default function DietsPage() {
  const diets = useFetch(() => api<Diet[]>('/diets'), []);
  const meals = useFetch(() => api<Meal[]>('/meals'), []);
  const [editing, setEditing] = useState<Diet | 'new' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      setActionError(null);
      void diets.reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Dietas" subtitle="Uma dieta é a agenda semanal das suas refeições. A dieta ativa alimenta a agenda de cada dia.">
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Nova dieta
        </button>
      </PageHeader>

      {(diets.error || actionError) && <div className="mb-4"><ErrorBox message={(diets.error || actionError)!} onRetry={diets.reload} /></div>}
      {!diets.data && diets.loading && <Loading />}
      {diets.data?.length === 0 && <Empty>Nenhuma dieta ainda. Cadastre suas refeições e depois monte a agenda semanal.</Empty>}

      <div className="flex flex-col gap-4">
        {diets.data?.map((d) => (
          <Card
            key={d.id}
            title={
              <span className="flex items-center gap-2">
                {d.name}
                {d.active && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent normal-case">ATIVA</span>}
              </span>
            }
            action={
              <div className="flex flex-wrap gap-2">
                {!d.active && (
                  <button className="btn btn-sm" onClick={() => run(() => post(`/diets/${d.id}/activate`))}>
                    Ativar
                  </button>
                )}
                <button className="btn btn-sm" onClick={() => setEditing(d)}>
                  Editar
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => confirm(`Remover a dieta "${d.name}"?`) && run(() => del(`/diets/${d.id}`))}
                >
                  Remover
                </button>
              </div>
            }
          >
            <p className="num mb-3 text-sm text-muted">Média de {fmt(d.averageKcal)} kcal por dia</p>
            <div className="mb-4 grid grid-cols-7 gap-1.5 text-center">
              {d.byWeekday.map((w) => (
                <div key={w.weekday} className="rounded-lg bg-surface2 px-1 py-2">
                  <p className="text-xs font-medium text-muted">{WEEKDAYS[w.weekday]}</p>
                  <p className="num text-sm font-semibold">{w.totals.kcal ? fmt(w.totals.kcal) : '—'}</p>
                  <p className="num text-[10px] text-muted">{w.totals.kcal ? `P${fmt(w.totals.protein)} C${fmt(w.totals.carbs)} G${fmt(w.totals.fat)}` : ''}</p>
                </div>
              ))}
            </div>
            {d.entries.length === 0 ? (
              <p className="text-sm text-muted">Sem refeições programadas.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {d.entries.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                    <span>
                      <span className="num mr-2 text-muted">{e.time}</span>
                      <b className="font-medium">{e.label}</b>
                      <span className="text-muted"> — {e.meal.name}</span>
                    </span>
                    <span className="num text-xs text-muted">
                      {e.weekdays.length === 7 ? 'Todos os dias' : e.weekdays.map((w) => WEEKDAYS[w]).join(', ')} · {fmt(e.meal.totals.kcal)} kcal
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      {editing && (
        <DietEditor
          diet={editing === 'new' ? null : editing}
          meals={meals.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void diets.reload();
          }}
        />
      )}
    </>
  );
}
