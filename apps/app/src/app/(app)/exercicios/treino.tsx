import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  type CalorieEstimate,
  effectiveSpeedKmh,
  fmt,
  normalizeTime,
  nowTime,
  ops,
  parseNumber,
  today,
  type WorkoutPreview,
  workoutCalories,
} from '@personutri/shared';
import { useActivities, useBody, useWorkoutsView } from '@/lib/queries';
import { useOutbox } from '@/lib/outbox';
import { Field, Select } from '@/ui/fields';
import { DateNav, Screen } from '@/ui/layout';
import { Banner, Button, Card, Loading, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

const HINT = { walk: 'Calculado pela velocidade e inclinação (equação do ACSM).', run: 'Calculado pela velocidade e inclinação (equação do ACSM).', cycle: 'Calculado pela velocidade média (tabela do Compendium).', met: '' } as const;
const opt = (s: string) => (s.trim() === '' ? undefined : parseNumber(s));

export default function WorkoutForm() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const router = useRouter();
  const { colors } = useTheme();
  const { submit } = useOutbox();
  const activities = useActivities();
  const body = useBody();
  const [date, setDate] = useState(params.date ?? today());
  const { day } = useWorkoutsView(params.date ?? today());
  const existing = editingId != null ? day?.workouts.find((w) => w.id === editingId) : undefined;

  const [activityId, setActivityId] = useState<number | ''>('');
  const [time, setTime] = useState(nowTime());
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [speed, setSpeed] = useState('');
  const [grade, setGrade] = useState('');
  const [hr, setHr] = useState('');
  const [device, setDevice] = useState('');
  const [notes, setNotes] = useState('');
  const [loaded, setLoaded] = useState(editingId == null);

  useEffect(() => {
    if (existing && !loaded) {
      setActivityId(existing.activity.id);
      setTime(existing.time ?? nowTime());
      setDuration(String(existing.durationMin));
      setDistance(existing.distanceKm != null ? String(existing.distanceKm) : '');
      setSpeed(existing.speedKmh != null && existing.distanceKm == null ? String(existing.speedKmh) : '');
      setGrade(existing.gradePercent != null ? String(existing.gradePercent) : '');
      setHr(existing.avgHeartRate != null ? String(existing.avgHeartRate) : '');
      setDevice(existing.deviceActiveKcal != null ? String(existing.deviceActiveKcal) : '');
      setNotes(existing.notes ?? '');
      setLoaded(true);
    }
  }, [existing, loaded]);

  const activity = activities.data?.find((a) => a.id === activityId);
  const speedBased = !!activity && activity.calcMode !== 'met';
  const durationN = opt(duration);
  const distanceN = opt(distance);
  const speedN = distanceN === undefined ? opt(speed) : undefined;
  const deviceN = opt(device);
  const hasSpeed = distanceN !== undefined || speedN !== undefined;
  const normTime = normalizeTime(time);
  const ready = !!activity && !!durationN && durationN >= 1 && durationN <= 1440 && (!speedBased || hasSpeed || deviceN !== undefined) && normTime !== null;

  // Estimativa local (funciona sem internet): peso mais recente do cache.
  const weightKg = body.data?.energy?.weightKg ?? body.data?.latestWeight?.weightKg ?? null;
  const estimate: CalorieEstimate | null = useMemo(() => {
    if (!ready || !activity) return null;
    const c = workoutCalories(activity, { durationMin: durationN!, distanceKm: distanceN, speedKmh: speedN, gradePercent: opt(grade) ?? null }, weightKg);
    return { weightKg, met: c.met, speedKmh: c.speedKmh, grossKcal: c.grossKcal, netKcal: c.netKcal };
  }, [ready, activity, durationN, distanceN, speedN, grade, weightKg]);

  function preview(): WorkoutPreview {
    return {
      activityId: activity!.id,
      activityName: activity!.name,
      category: activity!.category,
      calcMode: activity!.calcMode,
      met: activity!.met,
      time: normTime,
      durationMin: durationN!,
      distanceKm: speedBased ? (distanceN ?? null) : null,
      speedKmh: speedBased && distanceN === undefined ? (speedN ?? null) : null,
      gradePercent: activity!.calcMode === 'walk' || activity!.calcMode === 'run' ? (opt(grade) ?? null) : null,
      avgHeartRate: opt(hr) ?? null,
      deviceActiveKcal: deviceN ?? null,
      notes: notes.trim() || null,
      netKcal: estimate?.netKcal != null ? Math.round(estimate.netKcal) : null,
    };
  }

  return (
    <Screen
      title={editingId != null ? 'Editar treino' : 'Registrar treino'}
      back
      footer={
        <Button
          title="Salvar"
          variant="primary"
          disabled={!ready}
          onPress={() => {
            submit(editingId != null ? ops.workoutUpdate(editingId, date, preview()) : ops.workoutCreate(date, preview()));
            router.back();
          }}
        />
      }
    >
      {!loaded || activities.isLoading ? (
        <Loading />
      ) : (
        <>
          <Card>
            <Select
              label="Atividade"
              value={activityId}
              searchable
              options={(activities.data ?? []).map((a) => ({ value: a.id, label: a.name, group: a.category, hint: a.calcMode === 'met' && a.met ? `${fmt(a.met, 1)} MET` : 'por velocidade' }))}
              onChange={setActivityId}
            />
            <DateNav date={date} onChange={(d) => d <= today() && setDate(d)} long={false} />
            <Row gap={10} style={{ alignItems: 'flex-start' }}>
              <Field label="Duração (min)" value={duration} onChangeText={setDuration} keyboardType="decimal-pad" placeholder="45" />
              <Field label="Horário" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" error={normTime ? null : 'Inválido'} />
            </Row>
            {speedBased ? (
              <>
                <Row gap={10} style={{ alignItems: 'flex-start' }}>
                  <Field label="Distância (km)" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" placeholder="4,5" />
                  <View style={{ flex: 1, opacity: distanceN !== undefined ? 0.5 : 1 }}>
                    <Field label="ou velocidade (km/h)" value={speed} onChangeText={setSpeed} keyboardType="decimal-pad" editable={distanceN === undefined} placeholder="5,5" />
                  </View>
                </Row>
                {activity!.calcMode === 'walk' || activity!.calcMode === 'run' ? <Field label="Inclinação (%)" value={grade} onChangeText={setGrade} keyboardType="decimal-pad" placeholder="0" /> : null}
              </>
            ) : null}
            <Field label="FC média (bpm, opcional)" value={hr} onChangeText={setHr} keyboardType="number-pad" />
            <Field label="Calorias ativas do relógio (kcal, opcional)" value={device} onChangeText={setDevice} keyboardType="decimal-pad" hint="Substitui o cálculo quando informado." />
            <Field label="Observações" value={notes} onChangeText={setNotes} maxLength={300} />
          </Card>

          <View style={{ backgroundColor: colors.surface2, borderRadius: 12, padding: 12, gap: 4 }}>
            {activity && HINT[activity.calcMode] ? <Text v="small">{HINT[activity.calcMode]}</Text> : null}
            {deviceN !== undefined && ready ? (
              <Text v="h2" num>{fmt(deviceN)} kcal ativas <Text v="small">(valor informado)</Text></Text>
            ) : estimate && estimate.netKcal !== null ? (
              <Text v="h2" num>≈ {fmt(estimate.netKcal)} kcal ativas <Text v="small">({fmt(estimate.grossKcal)} brutas · {fmt(estimate.met, 1)} MET{estimate.speedKmh ? ` · ${fmt(estimate.speedKmh, 1)} km/h` : ''} · {fmt(estimate.weightKg, 1)} kg)</Text></Text>
            ) : ready && weightKg === null ? (
              <Text color={colors.warn}>Registre seu peso em Corpo para calcular as calorias.</Text>
            ) : (
              <Text v="small">{speedBased ? 'Informe a duração e a distância ou velocidade para estimar as calorias.' : 'Informe a duração para estimar as calorias.'}</Text>
            )}
            <Text v="small">Calorias ativas = acima do gasto de repouso; é o que soma ao gasto diário.</Text>
          </View>
          {activity && speedBased && !hasSpeed && deviceN === undefined ? <Banner tone="info">Informe a distância ou a velocidade, ou as calorias do relógio.</Banner> : null}
        </>
      )}
    </Screen>
  );
}
