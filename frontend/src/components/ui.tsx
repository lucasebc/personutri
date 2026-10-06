'use client';

import type { ReactNode } from 'react';
import type { Nutrition } from '@/lib/api';
import { fmt } from '@/lib/format';

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Bar({ value, max, color = 'var(--accent)', over = 'var(--bad)' }: { value: number; max: number; color?: string; over?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 105 ? over : color }} />
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-bad/40 bg-bad-soft px-4 py-3 text-sm text-bad">
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-muted">{label}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted first-letter:uppercase">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn btn-sm" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function MacroChips({ n, className = '' }: { n: Pick<Nutrition, 'kcal' | 'protein' | 'carbs' | 'fat'>; className?: string }) {
  return (
    <span className={`num inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className}`}>
      <b className="text-sm font-semibold">{fmt(n.kcal)} kcal</b>
      <span className="text-protein">P {fmt(n.protein, 1)}g</span>
      <span className="text-carbs">C {fmt(n.carbs, 1)}g</span>
      <span className="text-fat">G {fmt(n.fat, 1)}g</span>
    </span>
  );
}

export function SourceBadge({ source }: { source: 'taco' | 'off' | 'custom' }) {
  const map = { taco: ['TACO', 'bg-accent-soft text-accent'], off: ['Open Food Facts', 'bg-warn-soft text-warn'], custom: ['Meu', 'bg-surface2 text-muted'] } as const;
  const [label, cls] = map[source];
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
}

export function DateNav({ date, onChange, label }: { date: string; onChange: (d: string) => void; label: string }) {
  const shift = (days: number) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    onChange(d.toISOString().slice(0, 10));
  };
  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-sm" onClick={() => shift(-1)} aria-label="Dia anterior">
        ←
      </button>
      <input type="date" value={date} onChange={(e) => e.target.value && onChange(e.target.value)} className="!w-auto" aria-label={label} />
      <button className="btn btn-sm" onClick={() => shift(1)} aria-label="Próximo dia">
        →
      </button>
    </div>
  );
}
