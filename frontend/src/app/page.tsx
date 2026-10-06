'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bar as RBar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Balance, api, Dashboard } from '@/lib/api';
import { fmt, fmtSigned, formatDateLong, formatDateShort, today, WEEKDAYS, weekdayOf } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';
import { Bar, Card, DateNav, Empty, ErrorBox, Loading, PageHeader } from '@/components/ui';

const STATUS_LABEL = { done: 'Feita', pending: 'Pendente', skipped: 'Pulada' } as const;
const STATUS_CLASS = { done: 'bg-accent-soft text-accent', pending: 'bg-warn-soft text-warn', skipped: 'bg-surface2 text-muted' } as const;

function BalanceText({ b, label }: { b: Balance; label: string }) {
  const color = b.status === 'deficit' ? 'text-good' : b.status === 'surplus' ? 'text-bad' : 'text-muted';
  const word = b.status === 'deficit' ? 'Déficit' : b.status === 'surplus' ? 'Superávit' : 'Manutenção';
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`num text-2xl font-semibold ${color}`}>
        {word}
        {b.status !== 'maintenance' && <> de {fmt(Math.abs(b.vsTdee))} kcal</>}
      </p>
      <p className="num text-xs text-muted">
        {fmtSigned(b.vsTdee)} kcal vs gasto estimado
        {b.status !== 'maintenance' && <> · ≈ {fmtSigned(b.weeklyKg, 2)} kg/semana se repetir</>}
      </p>
    </div>
  );
}

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const over = consumed > target * 1.05;
  return (
    <svg viewBox="0 0 130 130" className="h-36 w-36 shrink-0" role="img" aria-label={`${fmt(consumed)} de ${fmt(target)} kcal`}>
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
      <circle
        cx="65"
        cy="65"
        r={r}
        fill="none"
        stroke={over ? 'var(--bad)' : 'var(--accent)'}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${pct * c} ${c}`}
        transform="rotate(-90 65 65)"
      />
      <text x="65" y="63" textAnchor="middle" className="num" fontSize="24" fontWeight="700" fill="var(--text)">
        {fmt(consumed)}
      </text>
      <text x="65" y="80" textAnchor="middle" fontSize="10" fill="var(--muted)">
        de {fmt(target)} kcal
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const [date, setDate] = useState(today());
  const { data: d, error, loading, reload } = useFetch(() => api<Dashboard>(`/dashboard?date=${date}`), [date]);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={formatDateLong(date)}>
        <DateNav date={date} onChange={setDate} label="Data do dashboard" />
      </PageHeader>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {!d && loading && <Loading />}

      {d && (
        <div className="flex flex-col gap-4">
          {(!d.hasProfile || !d.hasWeight) && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
              <span>Cadastre seus dados corporais para calcular metas e o déficit/superávit do dia.</span>
              <Link href="/corpo" className="btn btn-sm">
                Cadastrar dados
              </Link>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Calorias" className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-6">
                <CalorieRing consumed={d.consumed.kcal} target={d.targets?.kcal ?? d.projected.kcal} />
                <div className="grid min-w-[14rem] flex-1 gap-4">
                  {d.balance ? (
                    <BalanceText b={d.balance} label="Até agora" />
                  ) : (
                    <p className="text-sm text-muted">Consumido: {fmt(d.consumed.kcal)} kcal</p>
                  )}
                  {d.projectedBalance && d.pending.kcal > 0 && <BalanceText b={d.projectedBalance} label={`Se cumprir o que falta do plano (+${fmt(d.pending.kcal)} kcal)`} />}
                </div>
              </div>
              {d.energy && d.targets && (
                <dl className="num mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
                  {[
                    ['Consumido', d.consumed.kcal],
                    ['Meta', d.targets.kcal],
                    ['Restante da meta', d.remainingKcal],
                    ['Gasto estimado (TDEE)', d.energy.tdee],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <dt className="text-xs text-muted">{k}</dt>
                      <dd className="font-semibold">{fmt(v as number)} kcal</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>

            <Card title="Distribuição das calorias">
              {d.consumed.kcal > 0 ? (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Proteína', value: d.macros.protein.kcalPct ?? 0, color: 'var(--protein)' },
                            { name: 'Carboidrato', value: d.macros.carbs.kcalPct ?? 0, color: 'var(--carbs)' },
                            { name: 'Gordura', value: d.macros.fat.kcalPct ?? 0, color: 'var(--fat)' },
                          ]}
                          dataKey="value"
                          innerRadius={42}
                          outerRadius={62}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {['var(--protein)', 'var(--carbs)', 'var(--fat)'].map((c) => (
                            <Cell key={c} fill={c} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `${v}% das kcal`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="num mt-2 grid gap-1 text-sm">
                    {(
                      [
                        ['Proteína', d.macros.protein, 'var(--protein)'],
                        ['Carboidrato', d.macros.carbs, 'var(--carbs)'],
                        ['Gordura', d.macros.fat, 'var(--fat)'],
                      ] as const
                    ).map(([name, m, color]) => (
                      <li key={name} className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                          {name}
                        </span>
                        <span className="text-muted">
                          {m.kcalPct}% · {fmt(m.consumed, 1)} g
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Empty>Nada consumido ainda.</Empty>
              )}
            </Card>
          </div>

          <Card title="Macronutrientes">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['Proteína', d.macros.protein, 'var(--protein)'],
                  ['Carboidratos', d.macros.carbs, 'var(--carbs)'],
                  ['Gorduras', d.macros.fat, 'var(--fat)'],
                  ['Fibras', d.macros.fiber, 'var(--fiber)'],
                ] as const
              ).map(([name, m, color]) => (
                <div key={name}>
                  <div className="num mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{name}</span>
                    <span className="text-muted">
                      <b className="text-ink">{fmt(m.consumed, 1)}</b>
                      {m.target ? ` / ${fmt(m.target)} g` : ' g'}
                    </span>
                  </div>
                  <Bar value={m.consumed} max={m.target ?? 0} color={color} over={name === 'Fibras' ? color : 'var(--bad)'} />
                  {m.pct !== null && <p className="num mt-1 text-xs text-muted">{m.pct}% da meta</p>}
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card title="Últimos 7 dias" className="lg:col-span-3">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={d.week.map((w) => ({ ...w, label: `${WEEKDAYS[weekdayOf(w.date)]} ${formatDateShort(w.date)}` }))} margin={{ left: -10, right: 8, top: 8 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => `${fmt(Number(v))} kcal`} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <RBar dataKey="consumed" name="Consumido" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Line dataKey="tdee" name="Gasto (TDEE)" stroke="var(--fat)" strokeWidth={2} dot={false} connectNulls />
                    <Line dataKey="target" name="Meta" stroke="var(--muted)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title={`Refeições (${d.mealsDone}/${d.mealsTotal})`}
              className="lg:col-span-2"
              action={
                <Link href={`/agenda?date=${date}`} className="btn btn-sm">
                  Abrir agenda
                </Link>
              }
            >
              {d.meals.length === 0 ? (
                <Empty>Sem refeições para este dia. Ative uma dieta ou registre algo na agenda.</Empty>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {d.meals.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className={`block truncate font-medium ${m.status === 'skipped' ? 'text-muted line-through' : ''}`}>{m.label}</span>
                        <span className="num text-xs text-muted">
                          {m.time ?? '--:--'} · {fmt(m.kcal)} kcal{m.kind === 'free' ? ' · livre' : ''}
                        </span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[m.status]}`}>{STATUS_LABEL[m.status]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Micronutrientes e limites">
            <p className="mb-4 text-xs text-muted">
              Percentual de valores de referência diários para adultos (RDC 269/2005 e OMS). Barras verdes são metas a atingir; âmbar são limites a não ultrapassar.
            </p>
            {d.consumed.kcal === 0 ? (
              <Empty>Marque refeições como feitas ou registre algo para ver os micronutrientes.</Empty>
            ) : (
              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {d.micros.map((m) => {
                  const limit = m.kind === 'max';
                  const unknown = m.amount === null || m.pct === null;
                  return (
                    <div key={m.key}>
                      <div className="num mb-1 flex justify-between text-sm">
                        <span>
                          {m.label}
                          {limit && <span className="ml-1 text-xs text-muted">(limite)</span>}
                        </span>
                        {unknown ? (
                          <span className="text-xs text-muted">sem dados nos alimentos</span>
                        ) : (
                          <span className="text-muted">
                            {fmt(m.amount, m.reference < 5 ? 2 : 1)} {m.unit} · <b className={limit && m.pct! > 100 ? 'text-bad' : 'text-ink'}>{m.pct}%</b>
                          </span>
                        )}
                      </div>
                      <Bar value={m.amount ?? 0} max={m.reference} color={limit ? 'var(--warn)' : 'var(--good)'} over={limit ? 'var(--bad)' : 'var(--good)'} />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
