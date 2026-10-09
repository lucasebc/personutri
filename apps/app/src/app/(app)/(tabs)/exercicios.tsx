import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { fmt, formatDateLong, ops, today, type WorkoutViewWithSync } from '@personutri/shared';
import { useWorkoutsView } from '@/lib/queries';
import { useOutbox } from '@/lib/outbox';
import { DateNav, Screen } from '@/ui/layout';
import { Badge, Banner, Button, Card, Empty, Loading, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

function WorkoutCard({ w, date }: { w: WorkoutViewWithSync; date: string }) {
  const router = useRouter();
  const { submit } = useOutbox();
  const { colors } = useTheme();
  const details = [
    `${fmt(w.durationMin)} min`,
    w.distanceKm != null ? `${fmt(w.distanceKm, 2)} km` : null,
    w.speedKmh != null ? `${fmt(w.speedKmh, 1)} km/h` : null,
    w.gradePercent ? `inclinação ${fmt(w.gradePercent, 1)}%` : null,
    w.met != null ? `${fmt(w.met, 1)} MET` : null,
    w.avgHeartRate != null ? `FC ${w.avgHeartRate} bpm` : null,
    w.grossKcal != null ? `bruto ${fmt(w.grossKcal)} kcal` : null,
  ].filter(Boolean);
  return (
    <View testID={`workout-${w.activity.name}`} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 6 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={8}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text v="bodyBold"><Text v="small" num>{w.time ?? '--:--'}  </Text>{w.activity.name}</Text>
          <Row gap={6}>
            {w.source === 'device' ? <Badge label="relógio" tone="good" /> : null}
            {w.pendingSync ? <Badge label="a enviar" tone="warn" /> : null}
          </Row>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text v="bodyBold" num>{w.netKcal === null ? '—' : `${fmt(w.netKcal)} kcal`}</Text>
          <Text v="small">{w.kcalSource === 'device' ? 'medido' : w.kcalSource === 'calculated' ? 'estimado' : 'sem cálculo'}</Text>
        </View>
      </Row>
      <Text v="small" num>{details.join(' · ')}</Text>
      {w.netKcal === null ? <Text v="small" color={colors.warn}>Não foi possível calcular: registre seu peso em Corpo{w.activity.calcMode !== 'met' ? ' e informe velocidade ou distância' : ''}.</Text> : null}
      {w.notes ? <Text v="small">{w.notes}</Text> : null}
      <Row gap={8}>
        <Button title="Editar" size="sm" onPress={() => router.push({ pathname: '/exercicios/treino', params: { id: String(w.id), date } })} />
        <Button title="Remover" size="sm" variant="danger" accessibilityLabel={`Remover ${w.activity.name}`} onPress={() => submit(ops.workoutDelete(w.id, date, w.activity.name))} />
      </Row>
    </View>
  );
}

export default function ExerciseScreen() {
  const [date, setDate] = useState(today());
  const router = useRouter();
  const { day, isLoading, error, refetch, isFetching } = useWorkoutsView(date);
  const t = day?.totals;

  return (
    <Screen
      title="Exercícios"
      subtitle={formatDateLong(date)}
      right={<Button title="+ Treino" variant="primary" size="sm" onPress={() => router.push({ pathname: '/exercicios/treino', params: { date } })} />}
      onRefresh={() => void refetch()}
      refreshing={isFetching && !isLoading}
    >
      <DateNav date={date} onChange={setDate} />
      <Button title="Catálogo de atividades" size="sm" onPress={() => router.push('/exercicios/catalogo')} />
      {isLoading && !day ? <Loading /> : null}
      {error && !day ? <Banner tone="bad">{(error as Error).message}</Banner> : null}
      {t ? (
        <Card>
          <Row gap={12} style={{ flexWrap: 'wrap' }}>
            {[
              ['Treinos', String(t.sessions)],
              ['Tempo', `${fmt(t.minutes)} min`],
              ['Calorias ativas', `${fmt(t.netKcal)} kcal`],
              ['Calorias brutas', `${fmt(t.grossKcal)} kcal`],
            ].map(([k, v]) => (
              <View key={k} style={{ flexBasis: '45%', flexGrow: 1 }}>
                <Text v="small">{k}</Text>
                <Text v="h2" num>{v}</Text>
              </View>
            ))}
          </Row>
        </Card>
      ) : null}
      {day && day.workouts.length === 0 ? <Empty>Nenhum treino neste dia. Registre um treino ou escolha outra data.</Empty> : null}
      {day?.workouts.map((w) => <WorkoutCard key={w.id} w={w} date={date} />)}
    </Screen>
  );
}
