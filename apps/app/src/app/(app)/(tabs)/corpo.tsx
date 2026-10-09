import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  type ActivityLevel,
  type ActivityMode,
  type BodyProfile,
  fmt,
  fmtSigned,
  formatDateBr,
  formatDateShort,
  ops,
  parseDateBr,
  parseNumber,
  today,
} from '@personutri/shared';
import { MultiLine, type LineSeries } from '@/charts/MultiLine';
import { useBodyView, useForecast } from '@/lib/queries';
import { useOutbox } from '@/lib/outbox';
import { useApi } from '@/lib/session';
import { Field, Select } from '@/ui/fields';
import { DateNav, Screen } from '@/ui/layout';
import { Badge, Banner, Button, Card, Empty, Loading, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

const ACTIVITY: Record<ActivityLevel, string> = {
  sedentary: 'Sedentário (pouco ou nenhum exercício)',
  light: 'Leve (1–3 treinos/semana)',
  moderate: 'Moderado (3–5 treinos/semana)',
  high: 'Alto (6–7 treinos/semana)',
  athlete: 'Atleta (treino intenso ou trabalho físico)',
};
const ACTIVITY_DAILY: Record<ActivityLevel, string> = {
  sedentary: 'Sedentário no dia a dia (trabalho sentado)',
  light: 'Pouco ativo (fica em pé ou anda um pouco)',
  moderate: 'Ativo (trabalho com esforço físico leve)',
  high: 'Muito ativo (trabalho físico pesado)',
  athlete: 'Extremamente ativo (esforço físico o dia todo)',
};
const GOALS = [
  { value: -1, label: 'Emagrecer rápido (−1 kg/sem)' },
  { value: -0.5, label: 'Emagrecer (−0,5 kg/sem)' },
  { value: -0.25, label: 'Emagrecer devagar (−0,25 kg/sem)' },
  { value: 0, label: 'Manter o peso' },
  { value: 0.25, label: 'Ganhar devagar (+0,25 kg/sem)' },
  { value: 0.5, label: 'Ganhar massa (+0,5 kg/sem)' },
];

function StatCard({ k, v, hint }: { k: string; v: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 10 }}>
      <Text v="small">{k}</Text>
      <Text v="h2" num>{v}</Text>
      {hint ? <Text v="small">{hint}</Text> : null}
    </View>
  );
}

function ForecastSection() {
  const { colors } = useTheme();
  const f = useForecast();
  if (f.isLoading) return <Loading />;
  if (f.error && !f.data) return <Banner tone="bad">{(f.error as Error).message}</Banner>;
  const forecast = f.data;
  if (!forecast) return null;
  if (!forecast.ready) return <Empty>{forecast.reason === 'no-profile' ? 'Salve o perfil corporal para ver a previsão.' : 'Registre pelo menos uma pesagem para iniciar a previsão.'}</Empty>;

  const { weeks, projection, summary } = forecast;
  const lastReal = [...weeks].reverse().find((w) => w.measured !== null || w.predicted !== null);
  const n = weeks.length;
  const pad = (len: number) => Array<number | null>(len).fill(null);
  const xLabels = [...weeks.map((w) => formatDateShort(w.weekStart)), ...projection.map((p) => formatDateShort(p.weekStart))];
  const projected = lastReal && projection.length ? [...pad(n - 1), lastReal.measured ?? lastReal.predicted, ...projection.map((p) => p.predicted)] : [];
  const series: LineSeries[] = [
    { name: 'Meta', color: colors.muted, dashed: true, values: [...weeks.map((w) => w.goal), ...projection.map((p) => p.goal)] },
    { name: 'Previsto', color: colors.carbs, values: [...weeks.map((w) => w.predicted), ...pad(projection.length)], points: true },
    ...(projected.length ? [{ name: 'Projeção', color: colors.carbs, dotted: true, values: projected } as LineSeries] : []),
    { name: 'Medido', color: colors.protein, values: [...weeks.map((w) => w.measured), ...pad(projection.length)], points: true },
  ];

  return (
    <View style={{ gap: 12 }}>
      <Row gap={8} style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
        <StatCard k="Variação medida" v={summary.measuredChangePerWeek === null ? '—' : `${fmtSigned(summary.measuredChangePerWeek, 2)} kg/sem`} hint="entre as duas últimas semanas completas" />
        <StatCard k="Variação prevista" v={summary.predictedChangePerWeek === null ? '—' : `${fmtSigned(summary.predictedChangePerWeek, 2)} kg/sem`} hint="pelo balanço calórico registrado" />
        <StatCard k="Erro médio" v={summary.meanAbsError === null ? '—' : `${fmt(summary.meanAbsError, 2)} kg`} hint="média do |medido − previsto|" />
        <StatCard k="Gasto calibrado" v={summary.calibratedTdee === null ? '—' : `${fmt(summary.calibratedTdee)} kcal`} hint={summary.calibratedTdee === null ? 'precisa de ≥ 4 dias registrados em semanas completas' : undefined} />
      </Row>
      <MultiLine xLabels={xLabels} series={series} refLine={summary.targetWeightKg !== null ? { value: summary.targetWeightKg, label: 'alvo', color: colors.good } : undefined} />
      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        {[['Medido (média da semana)', colors.protein], ['Previsto', colors.carbs], ['Projeção', colors.carbs], ['Meta', colors.muted]].map(([name, c]) => (
          <Row key={name} gap={5}><View style={{ width: 14, height: 3, backgroundColor: c }} /><Text v="small">{name}</Text></Row>
        ))}
      </Row>
      {[...weeks].reverse().map((w) => (
        <View key={w.weekStart} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 2 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text v="bodyBold" num>{formatDateShort(w.weekStart)} – {formatDateShort(w.weekEnd)}{w.partial ? <Text v="small">  em andamento</Text> : null}</Text>
            <Text v="small" num color={w.error === null ? colors.muted : Math.abs(w.error) <= 0.3 ? colors.good : colors.warn}>{w.error !== null ? `${fmtSigned(w.error, 2)} kg` : '—'}</Text>
          </Row>
          <Text v="small" num>
            Medido {w.measured !== null ? `${fmt(w.measured, 2)} kg` : '—'} · Previsto {w.predicted !== null ? `${fmt(w.predicted, 2)} kg` : '—'} · Ingestão {w.avgIntake !== null ? `${fmt(w.avgIntake)} kcal${w.intakeSource === 'plan' ? ' (meta)' : ''}` : '—'} · {w.partial ? `${w.loggedDays} dias (parcial)` : `${w.loggedDays}/7 dias`}
          </Text>
        </View>
      ))}
      <Text v="small">
        O peso previsto de cada semana parte da média medida da semana anterior e soma o balanço calórico (consumo registrado − gasto estimado) ÷ 7.700 kcal por kg. Semanas sem consumo registrado usam a meta do plano. Diferenças acima de ~0,3 kg costumam ser retenção de líquidos ou registro incompleto.
      </Text>
    </View>
  );
}

function WeightSection() {
  const { weights } = useBodyView();
  const { submit, discard, ops: queue } = useOutbox();
  const [date, setDate] = useState(today());
  const [w, setW] = useState('');
  const [fat, setFat] = useState('');
  const [waist, setWaist] = useState('');
  const kg = parseNumber(w);
  const opt = (s: string) => (s.trim() === '' ? null : parseNumber(s));

  return (
    <Card title="Registrar pesagem">
      <DateNav date={date} onChange={(d) => d <= today() && setDate(d)} long={false} />
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <Field label="Peso (kg)" value={w} onChangeText={setW} keyboardType="decimal-pad" placeholder="80,2" accessibilityLabel="Peso em kg" />
        <Field label="% gordura" value={fat} onChangeText={setFat} keyboardType="decimal-pad" placeholder="opcional" />
        <Field label="Cintura (cm)" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" placeholder="opcional" />
      </Row>
      <Button
        title="Registrar peso"
        variant="primary"
        disabled={!(kg >= 20 && kg <= 400)}
        onPress={() => {
          submit(ops.weightAdd(date, kg, opt(fat), opt(waist)));
          setW('');
          setFat('');
          setWaist('');
        }}
      />
      {[...weights].reverse().slice(0, 30).map((x) => (
        <Row key={x.date} style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#0000', paddingVertical: 2 }}>
          <View style={{ flex: 1 }}>
            <Text num>{formatDateBr(x.date)}{x.pendingSync ? '  ' : ''}{x.pendingSync ? <Badge label="a enviar" tone="warn" /> : null}</Text>
            <Text v="small" num>{x.bodyFatPct != null ? `${fmt(x.bodyFatPct, 1)}% gordura ` : ''}{x.waistCm != null ? `· cintura ${fmt(x.waistCm, 1)} cm` : ''}</Text>
          </View>
          <Text v="bodyBold" num>{fmt(x.weightKg, 1)} kg</Text>
          <Button
            title="✕"
            size="sm"
            variant="danger"
            accessibilityLabel={`Remover pesagem de ${x.date}`}
            onPress={() => {
              if (x.id > 0 && !x.pendingSync) submit(ops.weightDelete(x.id, formatDateBr(x.date)));
              else {
                const pending = queue.find((o) => o.meta.kind === 'weight.add' && o.meta.date === x.date);
                if (pending) discard(pending.id);
                if (x.id > 0) submit(ops.weightDelete(x.id, formatDateBr(x.date)));
              }
            }}
          />
        </Row>
      ))}
    </Card>
  );
}

function ProfileForm({ onDone }: { onDone: () => void }) {
  const { data, weights } = useBodyView();
  const api = useApi();
  const qc = useQueryClient();
  const p = data?.profile;
  const [sex, setSex] = useState<'male' | 'female'>(p?.sex ?? 'male');
  const [birth, setBirth] = useState(p ? formatDateBr(p.birthDate) : '');
  const [height, setHeight] = useState(p ? String(p.heightCm) : '');
  const [mode, setMode] = useState<ActivityMode>(p?.activityMode ?? 'tracked');
  const [level, setLevel] = useState<ActivityLevel>(p?.activityLevel ?? 'light');
  const [goal, setGoal] = useState<number>(p?.weeklyGoalKg ?? -0.5);
  const [target, setTarget] = useState(p?.targetWeightKg != null ? String(p.targetWeightKg) : '');
  const [protein, setProtein] = useState(p ? String(p.proteinPerKg) : '1.8');
  const [fatPct, setFatPct] = useState(p ? String(p.fatPercent) : '25');
  const [formula, setFormula] = useState<'mifflin' | 'katch'>(p?.bmrFormula ?? 'mifflin');
  const [currentWeight, setCurrentWeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsWeight = weights.length === 0;
  const birthIso = parseDateBr(birth);
  const valid = !!birthIso && parseNumber(height) > 0 && (!needsWeight || parseNumber(currentWeight) > 0);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body: Partial<BodyProfile> & { currentWeightKg?: number } = {
        sex,
        birthDate: birthIso!,
        heightCm: parseNumber(height),
        activityLevel: level,
        activityMode: mode,
        weeklyGoalKg: goal,
        targetWeightKg: target.trim() ? parseNumber(target) : null,
        proteinPerKg: parseNumber(protein),
        fatPercent: parseNumber(fatPct),
        bmrFormula: formula,
      };
      if (needsWeight) body.currentWeightKg = parseNumber(currentWeight);
      await api.put('/body/profile', body);
      await qc.invalidateQueries();
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Perfil corporal">
      <Select label="Sexo biológico" value={sex} options={[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Feminino' }]} onChange={setSex} />
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <Field label="Nascimento (dd/mm/aaaa)" value={birth} onChangeText={setBirth} keyboardType="numbers-and-punctuation" placeholder="18/04/1992" error={birth && !birthIso ? 'Data inválida' : null} />
        <Field label="Altura (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="175" />
      </Row>
      {needsWeight ? <Field label="Peso atual (kg)" value={currentWeight} onChangeText={setCurrentWeight} keyboardType="decimal-pad" placeholder="80,5" /> : null}
      <Select
        label="Como contar o gasto diário"
        value={mode}
        options={[
          { value: 'tracked', label: 'Base do dia a dia + treinos registrados (recomendado)' },
          { value: 'level', label: 'Fator de atividade fixo (treinos não somam)' },
        ]}
        onChange={setMode}
      />
      <Select
        label={mode === 'tracked' ? 'Atividade no dia a dia (fora dos treinos)' : 'Nível de atividade (inclui seus treinos)'}
        value={level}
        options={Object.entries(mode === 'tracked' ? ACTIVITY_DAILY : ACTIVITY).map(([value, label]) => ({ value: value as ActivityLevel, label }))}
        onChange={setLevel}
      />
      <Select label="Objetivo" value={goal} options={GOALS} onChange={setGoal} />
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <Field label="Peso-alvo (kg)" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="opcional" />
        <Field label="Proteína (g/kg)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
        <Field label="Gordura (% kcal)" value={fatPct} onChangeText={setFatPct} keyboardType="decimal-pad" />
      </Row>
      <Select label="Fórmula do metabolismo basal" value={formula} options={[{ value: 'mifflin', label: 'Mifflin-St Jeor (padrão)' }, { value: 'katch', label: 'Katch-McArdle (usa % de gordura)' }]} onChange={setFormula} />
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <Text v="small">Salvar o perfil precisa de conexão com o servidor.</Text>
      <Button title="Salvar perfil" variant="primary" loading={busy} disabled={!valid} onPress={save} />
    </Card>
  );
}

export default function BodyScreen() {
  const { data: b, isLoading, error, refetch, isFetching } = useBodyView();
  const forecast = useForecast();
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (b && !b.profile) setEditing(true);
  }, [b]);

  return (
    <Screen
      title="Corpo"
      subtitle="Seus dados definem o gasto, as metas e a previsão de peso"
      onRefresh={() => void Promise.all([refetch(), forecast.refetch()])}
      refreshing={isFetching && !isLoading}
    >
      {isLoading && !b ? <Loading /> : null}
      {error && !b ? <Banner tone="bad">{(error as Error).message}</Banner> : null}
      {b ? (
        <>
          {b.energy ? (
            <Row gap={8} style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
              <StatCard k="Peso atual" v={`${fmt(b.energy.weightKg, 1)} kg`} hint={b.bmi ? `IMC ${fmt(b.bmi, 1)}` : undefined} />
              <StatCard k="Metabolismo basal" v={`${fmt(b.energy.bmr)} kcal`} hint={`${b.energy.age} anos`} />
              <StatCard k="Gasto diário (TDEE)" v={`${fmt(b.energy.tdee)} kcal`} hint={b.profile?.activityMode === 'tracked' ? 'base sem treinos; treinos somam por dia' : 'basal × atividade'} />
              <StatCard k="Meta calórica" v={`${fmt(b.energy.targetKcal)} kcal`} hint={b.profile && b.profile.weeklyGoalKg !== 0 ? `${fmtSigned(b.profile.weeklyGoalKg, 2)} kg/semana` : 'manutenção'} />
              <StatCard k="Macros da meta" v={`P ${fmt(b.energy.macros.protein)} · C ${fmt(b.energy.macros.carbs)} · G ${fmt(b.energy.macros.fat)}`} hint="gramas por dia" />
            </Row>
          ) : null}

          <Card title="Previsão semanal de peso">
            <ForecastSection />
          </Card>

          <WeightSection />

          {editing || !b.profile ? (
            <ProfileForm onDone={() => setEditing(false)} />
          ) : (
            <Card title="Perfil corporal" action={<Button title="Editar" size="sm" onPress={() => setEditing(true)} />}>
              <Row gap={14} style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {[
                  ['Sexo', b.profile.sex === 'male' ? 'Masculino' : 'Feminino'],
                  ['Altura', `${fmt(b.profile.heightCm)} cm`],
                  ['Gasto diário', b.profile.activityMode === 'tracked' ? 'Base + treinos' : 'Fator fixo'],
                  ['Atividade', (b.profile.activityMode === 'tracked' ? ACTIVITY_DAILY : ACTIVITY)[b.profile.activityLevel].split(' (')[0]],
                  ['Objetivo', GOALS.find((g) => g.value === b.profile!.weeklyGoalKg)?.label ?? `${b.profile.weeklyGoalKg} kg/sem`],
                  ['Peso-alvo', b.profile.targetWeightKg ? `${fmt(b.profile.targetWeightKg, 1)} kg` : '—'],
                  ['Proteína', `${fmt(b.profile.proteinPerKg, 1)} g/kg`],
                ].map(([k, v]) => (
                  <View key={k} style={{ flexBasis: '45%', flexGrow: 1 }}>
                    <Text v="small">{k}</Text>
                    <Text v="bodyBold">{v}</Text>
                  </View>
                ))}
              </Row>
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}
