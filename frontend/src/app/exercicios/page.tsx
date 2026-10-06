'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, api, BodySummary, CalorieEstimate, del, patch, post, put, Workout, WorkoutDay } from '@/lib/api';
import { fmt, formatDateLong, nowTime, today } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';
import { Card, DateNav, Empty, ErrorBox, Loading, Modal, PageHeader } from '@/components/ui';

const MODE_HINT = {
  walk: 'Calculado pela velocidade e inclinação (equação do ACSM).',
  run: 'Calculado pela velocidade e inclinação (equação do ACSM).',
  cycle: 'Calculado pela velocidade média (tabela do Compendium).',
  met: '',
} as const;

const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));

function WorkoutModal({
  date,
  workout,
  activities,
  onClose,
  onSaved,
}: {
  date: string;
  workout: Workout | null;
  activities: Activity[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [activityId, setActivityId] = useState<number | ''>(workout?.activity.id ?? '');
  const [day, setDay] = useState(workout?.date ?? date);
  const [time, setTime] = useState(workout?.time ?? nowTime());
  const [duration, setDuration] = useState(workout ? String(workout.durationMin) : '');
  const [distance, setDistance] = useState(workout?.distanceKm != null ? String(workout.distanceKm) : '');
  const [speed, setSpeed] = useState(workout?.speedKmh != null && workout.distanceKm == null ? String(workout.speedKmh) : '');
  const [grade, setGrade] = useState(workout?.gradePercent != null ? String(workout.gradePercent) : '');
  const [hr, setHr] = useState(workout?.avgHeartRate != null ? String(workout.avgHeartRate) : '');
  const [device, setDevice] = useState(workout?.deviceActiveKcal != null ? String(workout.deviceActiveKcal) : '');
  const [notes, setNotes] = useState(workout?.notes ?? '');
  const [estimate, setEstimate] = useState<CalorieEstimate | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activity = activities.find((a) => a.id === activityId);
  const byCategory = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities) map.set(a.category, [...(map.get(a.category) ?? []), a]);
    return [...map.entries()];
  }, [activities]);

  const durationN = num(duration);
  const speedBased = !!activity && activity.calcMode !== 'met';
  const hasSpeed = num(distance) !== undefined || num(speed) !== undefined;
  const deviceN = num(device);
  const ready = !!activity && !!durationN && durationN >= 1 && (!speedBased || hasSpeed || deviceN !== undefined);

  const payload = () => ({
    date: day,
    time: time || undefined,
    activityId,
    durationMin: durationN,
    distanceKm: speedBased ? num(distance) : undefined,
    speedKmh: speedBased && num(distance) === undefined ? num(speed) : undefined,
    gradePercent: activity && (activity.calcMode === 'walk' || activity.calcMode === 'run') ? num(grade) : undefined,
    avgHeartRate: num(hr),
    deviceActiveKcal: deviceN,
    notes: notes.trim() || undefined,
  });

  // Estimativa ao vivo (com pequeno atraso para não chamar a API a cada tecla)
  useEffect(() => {
    if (!ready || !activity) {
      setEstimate(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const p = payload();
        setEstimate(
          await post<CalorieEstimate>('/activities/estimate', {
            activityId: p.activityId,
            durationMin: p.durationMin,
            distanceKm: p.distanceKm,
            speedKmh: p.speedKmh,
            gradePercent: p.gradePercent,
          }),
        );
      } catch {
        setEstimate(null);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, duration, distance, speed, grade, ready]);

  async function save() {
    setSaving(true);
    try {
      if (workout) await put(`/workouts/${workout.id}`, payload());
      else await post('/workouts', payload());
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={workout ? 'Editar treino' : 'Registrar treino'} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field sm:col-span-2">
          <span>Atividade</span>
          <select value={activityId} onChange={(e) => setActivityId(e.target.value ? Number(e.target.value) : '')} autoFocus>
            <option value="">Escolher…</option>
            {byCategory.map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.calcMode === 'met' && a.met ? ` (${fmt(a.met, 1)} MET)` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Data</span>
          <input type="date" value={day} max={today()} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label className="field">
          <span>Horário</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="field">
          <span>Duração (min)</span>
          <input inputMode="decimal" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45" />
        </label>
        <label className="field">
          <span>FC média (bpm, opcional)</span>
          <input inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} />
        </label>

        {speedBased && (
          <>
            <label className="field">
              <span>Distância (km)</span>
              <input inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="ex.: 4,5" />
            </label>
            <label className="field">
              <span>ou velocidade média (km/h)</span>
              <input inputMode="decimal" value={speed} onChange={(e) => setSpeed(e.target.value)} disabled={num(distance) !== undefined} placeholder="ex.: 5,5" />
            </label>
            {(activity.calcMode === 'walk' || activity.calcMode === 'run') && (
              <label className="field">
                <span>Inclinação (%)</span>
                <input inputMode="decimal" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="0" />
              </label>
            )}
          </>
        )}

        <label className="field sm:col-span-2">
          <span>Calorias ativas medidas pelo relógio/app (kcal, opcional — substitui o cálculo)</span>
          <input inputMode="decimal" value={device} onChange={(e) => setDevice(e.target.value)} />
        </label>
        <label className="field sm:col-span-2">
          <span>Observações</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
        </label>
      </div>

      <div className="mt-4 rounded-lg bg-surface2 px-4 py-3 text-sm">
        {activity && MODE_HINT[activity.calcMode] && <p className="mb-1 text-xs text-muted">{MODE_HINT[activity.calcMode]}</p>}
        {estimate && estimate.netKcal !== null ? (
          <p className="num">
            <b className="text-lg">≈ {fmt(deviceN ?? estimate.netKcal)} kcal ativas</b>
            <span className="ml-2 text-muted">
              {deviceN !== undefined ? '(valor informado)' : `(${fmt(estimate.grossKcal)} kcal brutas · ${fmt(estimate.met, 1)} MET${estimate.speedKmh ? ` · ${fmt(estimate.speedKmh, 1)} km/h` : ''} · ${fmt(estimate.weightKg, 1)} kg)`}
            </span>
          </p>
        ) : deviceN !== undefined ? (
          <p className="num">
            <b className="text-lg">{fmt(deviceN)} kcal ativas</b> <span className="text-muted">(valor informado)</span>
          </p>
        ) : estimate && estimate.weightKg === null ? (
          <p className="text-warn">Registre seu peso em Corpo para calcular as calorias.</p>
        ) : (
          <p className="text-muted">{speedBased ? 'Informe a duração e a distância ou velocidade para estimar as calorias.' : 'Informe a duração para estimar as calorias.'}</p>
        )}
        <p className="mt-1 text-[11px] text-muted">Calorias ativas = acima do gasto de repouso. É o valor que soma ao seu gasto diário.</p>
      </div>

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={!ready || saving} onClick={save}>
          Salvar
        </button>
      </div>
    </Modal>
  );
}

function ActivityModal({ activity, categories, onClose, onSaved }: { activity: Activity | null; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(activity?.name ?? '');
  const [category, setCategory] = useState(activity?.category ?? '');
  const [met, setMet] = useState(activity?.met != null ? String(activity.met) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const metN = num(met);

  async function save() {
    setSaving(true);
    try {
      const body = { name: name.trim(), category: category.trim(), met: metN };
      if (activity) await patch(`/activities/${activity.id}`, body);
      else await post('/activities', body);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={activity ? 'Editar atividade' : 'Nova atividade'} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field sm:col-span-2">
          <span>Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Futevôlei" maxLength={80} autoFocus />
        </label>
        <label className="field">
          <span>Categoria</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} list="activity-categories" placeholder="Esportes" maxLength={60} />
          <datalist id="activity-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>MET (intensidade)</span>
          <input inputMode="decimal" value={met} onChange={(e) => setMet(e.target.value)} placeholder="ex.: 7,5" />
        </label>
      </div>
      <p className="mt-3 text-xs text-muted">
        MET é quantas vezes o gasto de repouso a atividade exige: 3 = caminhada leve, 6 = musculação intensa, 10 = corrida a 10 km/h. Procure o valor no Compendium of Physical Activities (pacompendium.com) ou ajuste pela sua experiência.
        Calorias = MET × seu peso (kg) × horas.
      </p>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={saving || name.trim().length < 2 || category.trim().length < 2 || !metN || metN < 1 || metN > 25} onClick={save}>
          Salvar
        </button>
      </div>
    </Modal>
  );
}

function Catalog({ activities, onChanged }: { activities: Activity[]; onChanged: () => void }) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Activity | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtered = activities.filter((a) => norm(`${a.name} ${a.category}`).includes(norm(q)));
  const groups = [...new Set(filtered.map((a) => a.category))];
  const categories = [...new Set(activities.map((a) => a.category))];

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="!w-auto min-w-[14rem] flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar atividade…" aria-label="Buscar atividade" />
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Nova atividade
        </button>
      </div>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <Card key={g} title={g}>
            <ul className="divide-y divide-line text-sm">
              {filtered
                .filter((a) => a.category === g)
                .map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate">
                      {a.name}
                      {!a.builtin && <span className="ml-2 rounded bg-surface2 px-1.5 py-0.5 text-[10px] text-muted">minha</span>}
                    </span>
                    <span className="num flex shrink-0 items-center gap-2 text-muted">
                      {a.calcMode === 'met' ? `${fmt(a.met, 1)} MET` : 'por velocidade'}
                      {!a.builtin && (
                        <>
                          <button className="btn btn-sm" onClick={() => setEditing(a)}>
                            Editar
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={async () => {
                              if (!confirm(`Remover "${a.name}"?`)) return;
                              try {
                                await del(`/activities/${a.id}`);
                                setError(null);
                                onChanged();
                              } catch (e) {
                                setError((e as Error).message);
                              }
                            }}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <Empty>Nenhuma atividade encontrada.</Empty>}
      <p className="mt-4 text-xs text-muted">
        Valores de MET aproximados do Compendium of Physical Activities (Ainsworth et al., 2011). Caminhada, corrida e ciclismo são calculados pela velocidade.
      </p>
      {editing && (
        <ActivityModal
          activity={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </>
  );
}

export default function ExercisePage() {
  const [date, setDate] = useState(today());
  const [tab, setTab] = useState<'workouts' | 'catalog'>('workouts');
  const [editing, setEditing] = useState<Workout | 'new' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('date');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) setDate(q);
  }, []);

  const day = useFetch(() => api<WorkoutDay>(`/workouts?date=${date}`), [date]);
  const acts = useFetch(() => api<Activity[]>('/activities'), []);
  const body = useFetch(() => api<BodySummary>('/body'), []);

  const t = day.data?.totals;
  const tracked = body.data?.profile?.activityMode === 'tracked';

  return (
    <>
      <PageHeader title="Exercícios" subtitle={formatDateLong(date)}>
        <div className="flex flex-wrap items-center gap-2">
          {tab === 'workouts' && <DateNav date={date} onChange={setDate} label="Data dos treinos" />}
          {tab === 'workouts' && (
            <button className="btn btn-primary" onClick={() => setEditing('new')} disabled={!acts.data}>
              + Registrar treino
            </button>
          )}
        </div>
      </PageHeader>

      <div className="mb-4 flex gap-2" role="tablist">
        {(
          [
            ['workouts', 'Treinos do dia'],
            ['catalog', 'Catálogo de atividades'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`btn btn-sm ${tab === id ? 'btn-primary' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      {(day.error || actionError) && <div className="mb-4"><ErrorBox message={(day.error || actionError)!} onRetry={day.reload} /></div>}

      {tab === 'catalog' ? (
        acts.data ? <Catalog activities={acts.data} onChanged={acts.reload} /> : <Loading />
      ) : (
        <>
          {t && (
            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              {[
                ['Treinos', String(t.sessions)],
                ['Tempo', `${fmt(t.minutes)} min`],
                ['Calorias ativas', `${fmt(t.netKcal)} kcal`],
                ['Calorias brutas', `${fmt(t.grossKcal)} kcal`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-surface px-4 py-3">
                  <p className="text-xs text-muted">{k}</p>
                  <p className="num text-lg font-semibold">{v}</p>
                </div>
              ))}
            </div>
          )}
          {body.data?.profile && (
            <p className="mb-4 text-xs text-muted">
              {tracked
                ? 'Seu perfil soma as calorias ativas dos treinos ao gasto do dia (e, com isso, à sua meta).'
                : 'Seu perfil usa fator de atividade fixo: os treinos são informativos e não alteram o gasto. Em Corpo, escolha “Base do dia a dia + treinos” para somá-los.'}
            </p>
          )}
          {!day.data && day.loading && <Loading />}
          {day.data && day.data.workouts.length === 0 && <Empty>Nenhum treino neste dia. Registre um treino ou escolha outra data.</Empty>}
          <ul className="flex flex-col gap-3">
            {day.data?.workouts.map((w) => (
              <li key={w.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-medium">
                    <span className="num mr-2 text-sm text-muted">{w.time ?? '--:--'}</span>
                    {w.activity.name}
                    {w.source === 'device' && <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">relógio</span>}
                  </h3>
                  <span className="num text-sm">
                    <b className="text-base">{w.netKcal === null ? '—' : `${fmt(w.netKcal)} kcal`}</b>
                    <span className="ml-1 text-xs text-muted">{w.kcalSource === 'device' ? 'medido' : w.kcalSource === 'calculated' ? 'estimado' : 'sem cálculo'}</span>
                  </span>
                </div>
                <p className="num mt-1 text-xs text-muted">
                  {fmt(w.durationMin)} min
                  {w.distanceKm != null && ` · ${fmt(w.distanceKm, 2)} km`}
                  {w.speedKmh != null && ` · ${fmt(w.speedKmh, 1)} km/h`}
                  {w.gradePercent ? ` · inclinação ${fmt(w.gradePercent, 1)}%` : ''}
                  {w.met != null && ` · ${fmt(w.met, 1)} MET`}
                  {w.avgHeartRate != null && ` · FC ${w.avgHeartRate} bpm`}
                  {w.grossKcal != null && ` · bruto ${fmt(w.grossKcal)} kcal`}
                </p>
                {w.netKcal === null && <p className="mt-1 text-xs text-warn">Não foi possível calcular: registre seu peso em Corpo{w.activity.calcMode !== 'met' ? ' e informe velocidade ou distância' : ''}.</p>}
                {w.notes && <p className="mt-1 text-xs text-muted">{w.notes}</p>}
                <div className="mt-2 flex gap-2">
                  <button className="btn btn-sm" onClick={() => setEditing(w)}>
                    Editar
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={async () => {
                      try {
                        await del(`/workouts/${w.id}`);
                        setActionError(null);
                        void day.reload();
                      } catch (e) {
                        setActionError((e as Error).message);
                      }
                    }}
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && acts.data && (
        <WorkoutModal
          date={date}
          workout={editing === 'new' ? null : editing}
          activities={acts.data}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void day.reload();
          }}
        />
      )}
    </>
  );
}
