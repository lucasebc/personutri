'use client';

import { useEffect, useState } from 'react';
import { api, Dashboard, DiaryEntry, Meal, patch, post, del } from '@/lib/api';
import { fmt, formatDateLong, nowTime, today } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';
import { EditableItem, fromItemView, ItemsEditor, toInputs } from '@/components/ItemsEditor';
import { Bar, Card, DateNav, Empty, ErrorBox, Loading, MacroChips, Modal, PageHeader } from '@/components/ui';

const STATUS_CLASS = {
  done: 'border-accent/50 bg-accent-soft/40',
  pending: 'border-line bg-surface',
  skipped: 'border-line bg-surface opacity-60',
} as const;

function EntryCard({ entry, onChanged, onError }: { entry: DiaryEntry; onChanged: () => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [busy, setBusy] = useState(false);
  // Status mostrado imediatamente ao clicar, até a API responder e a lista recarregar.
  const [optimistic, setOptimistic] = useState<DiaryEntry['status'] | null>(null);
  const status = optimistic ?? entry.status;

  useEffect(() => setOptimistic(null), [entry.status]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setOptimistic(null);
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (next: DiaryEntry['status']) => {
    setOptimistic(next);
    return run(() => patch(`/diary/entries/${entry.id}`, { status: next }));
  };
  const done = status === 'done';

  return (
    <li className={`rounded-xl border p-4 ${STATUS_CLASS[status]}`}>
      <div className="flex items-start gap-3">
        {entry.kind === 'planned' ? (
          <input
            type="checkbox"
            className="mt-1 !h-5 !w-5 shrink-0 accent-[var(--accent)]"
            checked={done}
            disabled={busy}
            onChange={() => setStatus(done ? 'pending' : 'done')}
            aria-label={`Marcar ${entry.label} como feita`}
          />
        ) : (
          <span className="mt-0.5 shrink-0 rounded bg-surface2 px-1.5 py-0.5 text-[10px] font-medium text-muted">LIVRE</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className={`font-medium ${status === 'skipped' ? 'line-through' : ''}`}>
              <span className="num mr-2 text-sm text-muted">{entry.time ?? '--:--'}</span>
              {entry.label}
            </h3>
            <MacroChips n={entry.totals} />
          </div>
          <p className="mt-1 truncate text-xs text-muted">{entry.items.map((i) => i.foodName).join(' · ')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn btn-sm" onClick={() => setOpen(!open)}>
              {open ? 'Ocultar itens' : 'Ver itens'}
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                setItems(entry.items.map(fromItemView));
                setEditing(true);
              }}
            >
              Ajustar quantidades
            </button>
            {entry.kind === 'planned' && status !== 'skipped' && (
              <button className="btn btn-sm" disabled={busy} onClick={() => setStatus('skipped')}>
                Pular
              </button>
            )}
            {entry.kind === 'planned' && status === 'skipped' && (
              <button className="btn btn-sm" disabled={busy} onClick={() => setStatus('pending')}>
                Desfazer
              </button>
            )}
            {entry.kind === 'free' && (
              <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => run(() => del(`/diary/entries/${entry.id}`))}>
                Remover
              </button>
            )}
          </div>
          {open && (
            <ul className="num mt-3 divide-y divide-line rounded-lg border border-line bg-surface text-sm">
              {entry.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 px-3 py-1.5">
                  <span className="truncate">{i.foodName}</span>
                  <span className="shrink-0 text-muted">
                    {fmt(i.grams)} g · {fmt(i.nutrition.kcal)} kcal
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {editing && (
        <Modal title={`Ajustar: ${entry.label}`} onClose={() => setEditing(false)}>
          <ItemsEditor items={items} onChange={setItems} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              disabled={busy || items.length === 0}
              onClick={() =>
                run(async () => {
                  await patch(`/diary/entries/${entry.id}`, { items: toInputs(items) });
                  setEditing(false);
                })
              }
            >
              Salvar
            </button>
          </div>
        </Modal>
      )}
    </li>
  );
}

function FreeEntryModal({ date, meals, onClose, onSaved }: { date: string; meals: Meal[]; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState('');
  const [time, setTime] = useState(nowTime());
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    try {
      await post(`/diary/${date}/free`, { label: label.trim() || undefined, time, items: toInputs(items) });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Registrar consumo livre" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <label className="field">
          <span>Descrição (opcional)</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Lanche fora de hora" maxLength={60} />
        </label>
        <label className="field">
          <span>Horário</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      {meals.length > 0 && (
        <label className="field mt-3 block">
          <span>Preencher com uma refeição cadastrada</span>
          <select
            value=""
            onChange={(e) => {
              const meal = meals.find((m) => m.id === Number(e.target.value));
              if (meal) {
                setItems(meal.items.map(fromItemView));
                if (!label) setLabel(meal.name);
              }
            }}
          >
            <option value="">Escolher…</option>
            {meals.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({fmt(m.totals.kcal)} kcal)
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="mt-4">
        <ItemsEditor items={items} onChange={setItems} />
      </div>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={saving || items.length === 0 || items.some((i) => !(i.grams > 0))} onClick={save}>
          Registrar
        </button>
      </div>
    </Modal>
  );
}

export default function AgendaPage() {
  const [date, setDate] = useState(today());
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('date');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) setDate(q);
  }, []);

  const diary = useFetch(() => api<{ entries: DiaryEntry[] }>(`/diary/${date}`), [date]);
  const dash = useFetch(() => api<Dashboard>(`/dashboard?date=${date}`), [date]);
  const meals = useFetch(() => api<Meal[]>('/meals'), []);

  const reload = () => {
    setActionError(null);
    void diary.reload();
    void dash.reload();
  };

  const d = dash.data;
  return (
    <>
      <PageHeader title="Agenda" subtitle={formatDateLong(date)}>
        <div className="flex flex-wrap items-center gap-2">
          <DateNav date={date} onChange={setDate} label="Data da agenda" />
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            + Consumo livre
          </button>
        </div>
      </PageHeader>

      {(diary.error || actionError) && <div className="mb-4"><ErrorBox message={(diary.error || actionError)!} onRetry={reload} /></div>}

      {d && (
        <Card className="mb-4">
          <div className="grid gap-4 sm:grid-cols-[1.2fr_2fr] sm:items-center">
            <div>
              <p className="text-xs text-muted">Consumido no dia{d.targets ? ' / meta' : ''}</p>
              <p className="num text-2xl font-semibold">
                {fmt(d.consumed.kcal)}
                {d.targets && <span className="text-base font-normal text-muted"> / {fmt(d.targets.kcal)} kcal</span>}
              </p>
              {d.targets && <div className="mt-2"><Bar value={d.consumed.kcal} max={d.targets.kcal} /></div>}
              {d.balance && (
                <p className="num mt-1.5 text-xs text-muted">
                  {d.balance.status === 'deficit' ? 'Déficit' : d.balance.status === 'surplus' ? 'Superávit' : 'Manutenção'} parcial de {fmt(Math.abs(d.balance.vsTdee))} kcal vs gasto estimado
                </p>
              )}
            </div>
            <div className="num grid grid-cols-3 gap-3 text-sm">
              {(
                [
                  ['Proteína', d.macros.protein, 'text-protein'],
                  ['Carbo', d.macros.carbs, 'text-carbs'],
                  ['Gordura', d.macros.fat, 'text-fat'],
                ] as const
              ).map(([name, m, cls]) => (
                <div key={name}>
                  <p className={`text-xs ${cls}`}>{name}</p>
                  <p className="font-semibold">
                    {fmt(m.consumed, 1)}
                    {m.target ? <span className="font-normal text-muted"> / {fmt(m.target)} g</span> : ' g'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {!diary.data && diary.loading && <Loading />}
      {diary.data && diary.data.entries.length === 0 && (
        <Empty>
          Nenhuma refeição para este dia. Cadastre uma dieta em <b>Dietas</b> para gerar a agenda automaticamente, ou registre um consumo livre.
        </Empty>
      )}
      <ul className="flex flex-col gap-3">
        {diary.data?.entries.map((e) => (
          <EntryCard key={e.id} entry={e} onChanged={reload} onError={setActionError} />
        ))}
      </ul>

      {adding && (
        <FreeEntryModal
          date={date}
          meals={meals.data ?? []}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            reload();
          }}
        />
      )}
    </>
  );
}
