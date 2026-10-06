'use client';

import { useState } from 'react';
import { api, del, Meal, post, put } from '@/lib/api';
import { fmt } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';
import { EditableItem, fromItemView, ItemsEditor, toInputs } from '@/components/ItemsEditor';
import { Card, Empty, ErrorBox, Loading, MacroChips, Modal, PageHeader } from '@/components/ui';

function MealEditor({ meal, onClose, onSaved }: { meal: Meal | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(meal?.name ?? '');
  const [notes, setNotes] = useState(meal?.notes ?? '');
  const [items, setItems] = useState<EditableItem[]>(meal ? meal.items.map(fromItemView) : []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    const body = { name: name.trim(), notes: notes.trim() || undefined, items: toInputs(items) };
    try {
      if (meal) await put(`/meals/${meal.id}`, body);
      else await post('/meals', body);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={meal ? 'Editar refeição' : 'Nova refeição'} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          <span>Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Almoço padrão" maxLength={80} autoFocus />
        </label>
        <label className="field">
          <span>Observações (opcional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
        </label>
      </div>
      <div className="mt-4">
        <ItemsEditor items={items} onChange={setItems} />
      </div>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={saving || name.trim().length < 2 || items.length === 0 || items.some((i) => !(i.grams > 0))} onClick={save}>
          Salvar
        </button>
      </div>
    </Modal>
  );
}

export default function MealsPage() {
  const { data, error, loading, reload } = useFetch(() => api<Meal[]>('/meals'), []);
  const [editing, setEditing] = useState<Meal | 'new' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function remove(meal: Meal) {
    if (!confirm(`Remover a refeição "${meal.name}"?`)) return;
    try {
      await del(`/meals/${meal.id}`);
      setActionError(null);
      void reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Refeições" subtitle="Combinações de alimentos que você repete: monte uma vez, use nas dietas e na agenda.">
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Nova refeição
        </button>
      </PageHeader>

      {(error || actionError) && <div className="mb-4"><ErrorBox message={(error || actionError)!} onRetry={reload} /></div>}
      {!data && loading && <Loading />}
      {data && data.length === 0 && <Empty>Nenhuma refeição cadastrada ainda. Crie a primeira para começar.</Empty>}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((m) => (
          <Card
            key={m.id}
            title={m.name}
            action={
              <div className="flex gap-2">
                <button className="btn btn-sm" onClick={() => setEditing(m)}>
                  Editar
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => remove(m)}>
                  Remover
                </button>
              </div>
            }
          >
            <MacroChips n={m.totals} />
            <p className="num mt-1 text-xs text-muted">
              Fibras {fmt(m.totals.fiber, 1)} g · Sódio {fmt(m.totals.micros.sodium ?? 0)} mg · Ferro {fmt(m.totals.micros.iron ?? 0, 1)} mg · Cálcio {fmt(m.totals.micros.calcium ?? 0)} mg
            </p>
            <ul className="num mt-3 divide-y divide-line text-sm">
              {m.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-1.5">
                  <span className="truncate">{i.foodName}</span>
                  <span className="shrink-0 text-muted">
                    {fmt(i.grams)} g · {fmt(i.nutrition.kcal)} kcal
                  </span>
                </li>
              ))}
            </ul>
            {m.notes && <p className="mt-2 text-xs text-muted">{m.notes}</p>}
          </Card>
        ))}
      </div>

      {editing && (
        <MealEditor
          meal={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}
    </>
  );
}
