import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { fmt, WEEKDAYS } from '@personutri/shared';
import { useDiets } from '@/lib/queries';
import { useApi } from '@/lib/session';
import { Screen } from '@/ui/layout';
import { Badge, Banner, Button, Card, Empty, Loading, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

export default function DietsScreen() {
  const diets = useDiets();
  const router = useRouter();
  const api = useApi();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      setError(null);
      await qc.invalidateQueries();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen
      title="Dietas"
      subtitle="A dieta ativa alimenta a agenda de cada dia"
      back
      right={<Button title="+ Nova" variant="primary" size="sm" onPress={() => router.push({ pathname: '/dietas/[id]', params: { id: 'novo' } })} />}
      onRefresh={() => void diets.refetch()}
      refreshing={diets.isFetching && !diets.isLoading}
    >
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {diets.isLoading ? <Loading /> : null}
      {diets.error && !diets.data ? <Banner tone="bad">{(diets.error as Error).message}</Banner> : null}
      {diets.data?.length === 0 ? <Empty>Nenhuma dieta ainda. Cadastre suas refeições e depois monte a agenda semanal.</Empty> : null}
      {diets.data?.map((d) => (
        <Card key={d.id} title={d.name} testID={`diet-${d.name}`} action={d.active ? <Badge label="ATIVA" tone="good" /> : undefined}>
          <Text v="small" num>Média de {fmt(d.averageKcal)} kcal por dia</Text>
          <Row gap={4}>
            {d.byWeekday.map((w) => (
              <View key={w.weekday} style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 8, paddingVertical: 6, alignItems: 'center' }}>
                <Text v="small">{WEEKDAYS[w.weekday]}</Text>
                <Text v="bodyBold" num style={{ fontSize: 12 }}>{w.totals.kcal ? fmt(w.totals.kcal) : '—'}</Text>
              </View>
            ))}
          </Row>
          {d.entries.length === 0 ? <Text v="small">Sem refeições programadas.</Text> : null}
          {d.entries.map((e) => (
            <View key={e.id} style={{ gap: 2 }}>
              <Text><Text v="small" num>{e.time}  </Text><Text v="bodyBold">{e.label}</Text><Text v="small"> — {e.meal.name}</Text></Text>
              <Text v="small" num>{e.weekdays.length === 7 ? 'Todos os dias' : e.weekdays.map((w) => WEEKDAYS[w]).join(', ')} · {fmt(e.meal.totals.kcal)} kcal</Text>
            </View>
          ))}
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {!d.active ? <Button title="Ativar" size="sm" onPress={() => void run(() => api.post(`/diets/${d.id}/activate`))} /> : null}
            <Button title="Editar" size="sm" onPress={() => router.push({ pathname: '/dietas/[id]', params: { id: String(d.id) } })} />
            <Button title="Remover" size="sm" variant="danger" accessibilityLabel={`Remover ${d.name}`} onPress={() => void run(() => api.del(`/diets/${d.id}`))} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
