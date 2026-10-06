'use client';

import { useEffect, useState } from 'react';
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ActivityLevel, api, BodyProfile, BodySummary, del, Forecast, post, put } from '@/lib/api';
import { fmt, fmtSigned, formatDateShort, today } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';
import { Card, Empty, ErrorBox, Loading, PageHeader } from '@/components/ui';

const ACTIVITY: Record<ActivityLevel, string> = {
  sedentary: 'Sedentário (pouco ou nenhum exercício)',
  light: 'Leve (1–3 treinos/semana)',
  moderate: 'Moderado (3–5 treinos/semana)',
  high: 'Alto (6–7 treinos/semana)',
  athlete: 'Atleta (treino intenso ou trabalho físico)',
};

const GOALS = [
  { value: -1, label: 'Emagrecer rápido (−1 kg/sem)' },
  { value: -0.5, label: 'Emagrecer (−0,5 kg/sem)' },
  { value: -0.25, label: 'Emagrecer devagar (−0,25 kg/sem)' },
  { value: 0, label: 'Manter o peso' },
  { value: 0.25, label: 'Ganhar devagar (+0,25 kg/sem)' },
  { value: 0.5, label: 'Ganhar massa (+0,5 kg/sem)' },
];

function ProfileForm({ summary, onSaved }: { summary: BodySummary; onSaved: () => void }) {
  const p = summary.profile;
  const [form, setForm] = useState({
    sex: p?.sex ?? 'male',
    birthDate: p?.birthDate ?? '',
    heightCm: p ? String(p.heightCm) : '',
    activityLevel: p?.activityLevel ?? 'moderate',
    weeklyGoalKg: p?.weeklyGoalKg ?? -0.5,
    targetWeightKg: p?.targetWeightKg != null ? String(p.targetWeightKg) : '',
    proteinPerKg: p ? String(p.proteinPerKg) : '1.8',
    fatPercent: p ? String(p.fatPercent) : '25',
    bmrFormula: p?.bmrFormula ?? 'mifflin',
    currentWeightKg: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setSaved(false);
  };
  const num = (s: string) => Number(s.replace(',', '.'));
  const needsWeight = summary.weights.length === 0;
  const valid = form.birthDate && num(form.heightCm) > 0 && (!needsWeight || num(form.currentWeightKg) > 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Partial<BodyProfile> & { currentWeightKg?: number } = {
        sex: form.sex as BodyProfile['sex'],
        birthDate: form.birthDate,
        heightCm: num(form.heightCm),
        activityLevel: form.activityLevel as ActivityLevel,
        weeklyGoalKg: Number(form.weeklyGoalKg),
        targetWeightKg: form.targetWeightKg.trim() ? num(form.targetWeightKg) : null,
        proteinPerKg: num(form.proteinPerKg),
        fatPercent: num(form.fatPercent),
        bmrFormula: form.bmrFormula as BodyProfile['bmrFormula'],
      };
      if (needsWeight) body.currentWeightKg = num(form.currentWeightKg);
      await put('/body/profile', body);
      setSaved(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
      <label className="field">
        <span>Sexo biológico</span>
        <select value={form.sex} onChange={set('sex')}>
          <option value="male">Masculino</option>
          <option value="female">Feminino</option>
        </select>
      </label>
      <label className="field">
        <span>Data de nascimento</span>
        <input type="date" value={form.birthDate} onChange={set('birthDate')} max={today()} required />
      </label>
      <label className="field">
        <span>Altura (cm)</span>
        <input inputMode="decimal" value={form.heightCm} onChange={set('heightCm')} placeholder="175" required />
      </label>
      {needsWeight && (
        <label className="field">
          <span>Peso atual (kg)</span>
          <input inputMode="decimal" value={form.currentWeightKg} onChange={set('currentWeightKg')} placeholder="80,5" required />
        </label>
      )}
      <label className="field sm:col-span-2">
        <span>Nível de atividade</span>
        <select value={form.activityLevel} onChange={set('activityLevel')}>
          {Object.entries(ACTIVITY).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Objetivo</span>
        <select value={form.weeklyGoalKg} onChange={set('weeklyGoalKg')}>
          {GOALS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Peso-alvo (kg, opcional)</span>
        <input inputMode="decimal" value={form.targetWeightKg} onChange={set('targetWeightKg')} placeholder="75" />
      </label>
      <label className="field">
        <span>Proteína (g por kg)</span>
        <input inputMode="decimal" value={form.proteinPerKg} onChange={set('proteinPerKg')} />
      </label>
      <label className="field">
        <span>Gordura (% das calorias)</span>
        <input inputMode="decimal" value={form.fatPercent} onChange={set('fatPercent')} />
      </label>
      <label className="field sm:col-span-2">
        <span>Fórmula do metabolismo basal</span>
        <select value={form.bmrFormula} onChange={set('bmrFormula')}>
          <option value="mifflin">Mifflin-St Jeor (padrão)</option>
          <option value="katch">Katch-McArdle (usa % de gordura da última pesagem)</option>
        </select>
      </label>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      <div className="flex items-center justify-end gap-3 sm:col-span-2">
        {saved && <span className="text-sm text-good">Salvo ✓</span>}
        <button className="btn btn-primary" disabled={saving || !valid}>
          Salvar perfil
        </button>
      </div>
    </form>
  );
}

function WeightForm({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState('');
  const [fat, setFat] = useState('');
  const [waist, setWaist] = useState('');
  const [error, setError] = useState<string | null>(null);
  const num = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : undefined);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post('/body/weights', { date, weightKg: num(weight), bodyFatPct: num(fat), waistCm: num(waist) });
      setWeight('');
      setFat('');
      setWaist('');
      setError(null);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={save} className="grid grid-cols-2 gap-3">
      <label className="field">
        <span>Data</span>
        <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label className="field">
        <span>Peso (kg)</span>
        <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80,2" required />
      </label>
      <label className="field">
        <span>% gordura</span>
        <input inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="opcional" />
      </label>
      <label className="field">
        <span>Cintura (cm)</span>
        <input inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="opcional" />
      </label>
      <button className="btn btn-primary col-span-2" disabled={!weight.trim()}>
        Registrar peso
      </button>
      {error && <p className="col-span-full text-sm text-bad">{error}</p>}
    </form>
  );
}

function ForecastSection({ forecast, energyTdee }: { forecast: Forecast; energyTdee: number | null }) {
  if (!forecast.ready) {
    return <Empty>{forecast.reason === 'no-profile' ? 'Salve o perfil corporal para ver a previsão.' : 'Registre pelo menos uma pesagem para iniciar a previsão.'}</Empty>;
  }
  const { weeks, projection, summary } = forecast;
  const lastReal = [...weeks].reverse().find((w) => w.measured !== null || w.predicted !== null);

  type Row = { label: string; measured?: number | null; predicted?: number | null; goal?: number | null; projected?: number | null };
  const rows: Row[] = weeks.map((w) => ({ label: formatDateShort(w.weekStart), measured: w.measured, predicted: w.predicted, goal: w.goal }));
  if (lastReal && projection.length) {
    // a linha de projeção parte do último ponto conhecido
    rows[rows.length - 1].projected = lastReal.measured ?? lastReal.predicted;
    for (const p of projection) rows.push({ label: formatDateShort(p.weekStart), projected: p.predicted, goal: p.goal });
  }

  const measuredTxt = summary.measuredChangePerWeek;
  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Variação medida', measuredTxt === null ? '—' : `${fmtSigned(measuredTxt, 2)} kg/sem`, 'entre as duas últimas semanas com pesagem'],
          ['Variação prevista', summary.predictedChangePerWeek === null ? '—' : `${fmtSigned(summary.predictedChangePerWeek, 2)} kg/sem`, 'pelo balanço calórico registrado'],
          ['Erro médio da previsão', summary.meanAbsError === null ? '—' : `${fmt(summary.meanAbsError, 2)} kg`, 'média do |medido − previsto|'],
          [
            'Gasto calibrado',
            summary.calibratedTdee === null ? '—' : `${fmt(summary.calibratedTdee)} kcal`,
            summary.calibratedTdee !== null && energyTdee ? `estimado pela fórmula: ${fmt(energyTdee)} kcal` : 'precisa de ≥ 4 dias registrados em semanas completas',
          ],
        ].map(([k, v, hint]) => (
          <div key={k} className="rounded-lg bg-surface2 px-3 py-2.5">
            <p className="text-xs text-muted">{k}</p>
            <p className="num text-lg font-semibold">{v}</p>
            <p className="text-[11px] text-muted">{hint}</p>
          </div>
        ))}
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ left: -8, right: 12, top: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v) => fmt(Number(v), 1)} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => `${fmt(Number(v), 2)} kg`} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} labelFormatter={(l) => `Semana de ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {summary.targetWeightKg !== null && <ReferenceLine y={summary.targetWeightKg} stroke="var(--good)" strokeDasharray="2 4" label={{ value: 'alvo', fill: 'var(--good)', fontSize: 11, position: 'insideTopRight' }} />}
            <Line dataKey="goal" name="Trajetória da meta" stroke="var(--muted)" strokeDasharray="6 4" strokeWidth={1.5} dot={false} connectNulls />
            <Line dataKey="predicted" name="Previsto" stroke="var(--carbs)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line dataKey="projected" name="Projeção" stroke="var(--carbs)" strokeDasharray="2 4" strokeWidth={2} dot={false} connectNulls />
            <Line dataKey="measured" name="Medido (média da semana)" stroke="var(--protein)" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="num w-full min-w-[34rem] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1.5 pr-3 font-medium">Semana</th>
              <th className="pr-3 text-right font-medium">Medido</th>
              <th className="pr-3 text-right font-medium">Previsto</th>
              <th className="pr-3 text-right font-medium">Diferença</th>
              <th className="pr-3 text-right font-medium">Ingestão média</th>
              <th className="text-right font-medium">Dias registrados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[...weeks].reverse().map((w) => (
              <tr key={w.weekStart}>
                <td className="py-1.5 pr-3">
                  {formatDateShort(w.weekStart)} – {formatDateShort(w.weekEnd)}
                  {w.partial && <span className="ml-1.5 rounded bg-surface2 px-1 text-[10px] text-muted">em andamento</span>}
                </td>
                <td className="pr-3 text-right">{w.measured !== null ? `${fmt(w.measured, 2)} kg` : '—'}</td>
                <td className="pr-3 text-right">{w.predicted !== null ? `${fmt(w.predicted, 2)} kg` : '—'}</td>
                <td className={`pr-3 text-right ${w.error === null ? '' : Math.abs(w.error) <= 0.3 ? 'text-good' : 'text-warn'}`}>{w.error !== null ? `${fmtSigned(w.error, 2)} kg` : '—'}</td>
                <td className="pr-3 text-right">
                  {w.avgIntake !== null ? `${fmt(w.avgIntake)} kcal` : '—'}
                  {w.intakeSource === 'plan' && w.avgIntake !== null && <span className="ml-1 text-[10px] text-muted">(meta)</span>}
                </td>
                <td className="text-right">{w.partial ? `${w.loggedDays} (parcial)` : `${w.loggedDays}/7`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Como funciona: o peso previsto de cada semana parte da média medida da semana anterior e soma o balanço calórico (consumo registrado − gasto estimado) ÷ 7.700 kcal por kg.
        Semanas sem consumo registrado usam a meta do plano como ingestão. Diferenças acima de ~0,3 kg costumam ser retenção de líquidos ou registro incompleto.
      </p>
    </>
  );
}

export default function BodyPage() {
  const body = useFetch(() => api<BodySummary>('/body'), []);
  const forecast = useFetch(() => api<Forecast>('/forecast/weekly?weeks=12&ahead=4'), []);
  const [showProfile, setShowProfile] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const b = body.data;
  useEffect(() => {
    if (b && !b.profile) setShowProfile(true);
  }, [b]);

  const reloadAll = () => {
    void body.reload();
    void forecast.reload();
  };

  async function removeWeight(id: number) {
    try {
      await del(`/body/weights/${id}`);
      reloadAll();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Corpo" subtitle="Seus dados corporais definem o gasto calórico, as metas do dia e a previsão de peso." />

      {(body.error || actionError) && <div className="mb-4"><ErrorBox message={(body.error || actionError)!} onRetry={reloadAll} /></div>}
      {!b && body.loading && <Loading />}

      {b && (
        <div className="flex flex-col gap-4">
          {b.energy && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ['Peso atual', `${fmt(b.energy.weightKg, 1)} kg`, b.bmi ? `IMC ${fmt(b.bmi, 1)}` : ''],
                ['Metabolismo basal', `${fmt(b.energy.bmr)} kcal`, `${b.energy.age} anos`],
                ['Gasto diário (TDEE)', `${fmt(b.energy.tdee)} kcal`, 'basal × atividade'],
                ['Meta calórica', `${fmt(b.energy.targetKcal)} kcal`, b.profile && b.profile.weeklyGoalKg !== 0 ? `${fmtSigned(b.profile.weeklyGoalKg, 2)} kg/semana` : 'manutenção'],
                ['Macros da meta', `P ${fmt(b.energy.macros.protein)} · C ${fmt(b.energy.macros.carbs)} · G ${fmt(b.energy.macros.fat)}`, 'gramas por dia'],
              ].map(([k, v, hint]) => (
                <div key={k} className="rounded-xl border border-line bg-surface px-4 py-3">
                  <p className="text-xs text-muted">{k}</p>
                  <p className="num text-lg font-semibold">{v}</p>
                  <p className="text-[11px] text-muted">{hint}</p>
                </div>
              ))}
            </div>
          )}

          <Card
            title="Previsão semanal de peso"
            action={
              <button className="btn btn-sm" onClick={() => void forecast.reload()}>
                Atualizar
              </button>
            }
          >
            {forecast.error && <ErrorBox message={forecast.error} onRetry={forecast.reload} />}
            {forecast.data && <ForecastSection forecast={forecast.data} energyTdee={b.energy?.tdee ?? null} />}
            {!forecast.data && forecast.loading && <Loading />}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Registrar pesagem">
              <WeightForm onSaved={reloadAll} />
              {b.weights.length > 0 && (
                <ul className="num mt-4 max-h-72 divide-y divide-line overflow-y-auto text-sm">
                  {[...b.weights].reverse().map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-3 py-1.5">
                      <span>{w.date.split('-').reverse().join('/')}</span>
                      <span className="flex-1 text-right text-muted">
                        {w.bodyFatPct != null && `${fmt(w.bodyFatPct, 1)}% gordura `}
                        {w.waistCm != null && `· cintura ${fmt(w.waistCm, 1)} cm`}
                      </span>
                      <b>{fmt(w.weightKg, 1)} kg</b>
                      <button className="btn btn-sm btn-danger" onClick={() => removeWeight(w.id)} aria-label={`Remover pesagem de ${w.date}`}>
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title="Perfil corporal"
              action={
                b.profile && (
                  <button className="btn btn-sm" onClick={() => setShowProfile(!showProfile)}>
                    {showProfile ? 'Ocultar' : 'Editar'}
                  </button>
                )
              }
            >
              {showProfile || !b.profile ? (
                <ProfileForm summary={b} onSaved={reloadAll} />
              ) : (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {[
                    ['Sexo', b.profile.sex === 'male' ? 'Masculino' : 'Feminino'],
                    ['Altura', `${fmt(b.profile.heightCm)} cm`],
                    ['Atividade', ACTIVITY[b.profile.activityLevel].split(' (')[0]],
                    ['Objetivo', GOALS.find((g) => g.value === b.profile!.weeklyGoalKg)?.label ?? `${b.profile.weeklyGoalKg} kg/sem`],
                    ['Peso-alvo', b.profile.targetWeightKg ? `${fmt(b.profile.targetWeightKg, 1)} kg` : '—'],
                    ['Proteína', `${fmt(b.profile.proteinPerKg, 1)} g/kg`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-muted">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
