'use client';

import { useEffect, useState } from 'react';
import { api, Food, FoodSearch } from '@/lib/api';
import { fmt } from '@/lib/format';
import { Modal, SourceBadge } from './ui';

type Tab = 'local' | 'off';

export function FoodRow({ food, onClick }: { food: Food; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start justify-between gap-3 rounded-lg border border-line px-3 py-2 text-left hover:bg-surface2">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{food.name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <SourceBadge source={food.source} />
          {food.brand && <span>{food.brand}</span>}
          {food.category && food.source !== 'off' && <span>{food.category}</span>}
        </span>
      </span>
      <span className="num shrink-0 text-right text-xs text-muted">
        <b className="block text-sm text-ink">{fmt(food.kcal)} kcal</b>
        P {fmt(food.protein, 1)} · C {fmt(food.carbs, 1)} · G {fmt(food.fat, 1)}
        <span className="block">por 100 g</span>
      </span>
    </button>
  );
}

/**
 * Busca de alimentos: aba "Meus e TACO" pesquisa o banco local conforme se digita;
 * aba "Produtos" consulta o Open Food Facts (produtos vendidos no Brasil) ao enviar.
 * Um código de barras (8–14 dígitos) em qualquer aba é consultado direto no Open Food Facts.
 */
export function FoodPicker({ onPick, onClose }: { onPick: (food: Food) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('local');
  const [q, setQ] = useState('');
  const [result, setResult] = useState<FoodSearch>({ foods: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState('');

  const isBarcode = /^\d{8,14}$/.test(q.trim());

  // Busca local com debounce
  useEffect(() => {
    if (tab !== 'local') return;
    const term = q.trim();
    if (term.length < 2) {
      setResult({ foods: [] });
      return;
    }
    if (isBarcode) return; // código de barras só na confirmação (consulta externa)
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setResult(await api<FoodSearch>(`/foods/search?source=local&q=${encodeURIComponent(term)}`));
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, tab, isBarcode]);

  async function runRemote(e?: React.FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    setLoading(true);
    setError(null);
    setSubmitted(term);
    try {
      const source = tab === 'off' && !isBarcode ? 'off' : 'all';
      setResult(await api<FoodSearch>(`/foods/search?source=${source}&q=${encodeURIComponent(term)}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Adicionar alimento" onClose={onClose}>
      <div className="mb-3 flex gap-2" role="tablist">
        {(
          [
            ['local', 'Meus e TACO'],
            ['off', 'Produtos (Open Food Facts)'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setResult({ foods: [] });
              setSubmitted('');
            }}
            className={`btn btn-sm ${tab === id ? 'btn-primary' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={runRemote} className="mb-3 flex gap-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === 'local' ? 'Ex.: arroz integral, banana, frango…' : 'Nome do produto ou código de barras'}
          aria-label="Buscar alimento"
        />
        {(tab === 'off' || isBarcode) && (
          <button className="btn btn-primary shrink-0" disabled={loading || q.trim().length < 2}>
            Buscar
          </button>
        )}
      </form>

      {error && <p className="mb-3 text-sm text-bad">{error}</p>}
      {result.offError && (
        <p className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          {result.offError} Mostrando apenas o que já está salvo no seu banco.
        </p>
      )}
      {loading && <p className="py-4 text-center text-sm text-muted">Buscando…</p>}

      <div className="flex flex-col gap-2">
        {result.foods.map((f) => (
          <FoodRow key={f.id} food={f} onClick={() => onPick(f)} />
        ))}
      </div>

      {!loading && result.foods.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">
          {tab === 'off' && !submitted
            ? 'Digite o nome de um produto e clique em Buscar. Os resultados vêm do Open Food Facts, filtrados para o Brasil.'
            : q.trim().length < 2
              ? 'Digite pelo menos 2 letras.'
              : 'Nada encontrado. Tente outro termo' + (tab === 'local' ? ' ou a aba de produtos.' : '.')}
        </p>
      )}
    </Modal>
  );
}
