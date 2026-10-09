import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { fmt } from '@personutri/shared';
import { MacroChips } from '@/features/bits';
import { useMeals } from '@/lib/queries';
import { useApi } from '@/lib/session';
import { Screen } from '@/ui/layout';
import { Banner, Button, Card, Empty, Loading, Row, Text } from '@/ui/primitives';

export default function MealsScreen() {
  const meals = useMeals();
  const router = useRouter();
  const api = useApi();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  async function remove(id: number, name: string) {
    try {
      await api.del(`/meals/${id}`);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['meals'] });
    } catch (e) {
      setError(`${name}: ${(e as Error).message}`);
    }
  }

  return (
    <Screen
      title="Refeições"
      subtitle="Combinações de alimentos que você repete"
      back
      right={<Button title="+ Nova" variant="primary" size="sm" onPress={() => router.push({ pathname: '/refeicoes/[id]', params: { id: 'novo' } })} />}
      onRefresh={() => void meals.refetch()}
      refreshing={meals.isFetching && !meals.isLoading}
    >
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {meals.isLoading ? <Loading /> : null}
      {meals.error && !meals.data ? <Banner tone="bad">{(meals.error as Error).message}</Banner> : null}
      {meals.data?.length === 0 ? <Empty>Nenhuma refeição cadastrada ainda. Crie a primeira para começar.</Empty> : null}
      {meals.data?.map((m) => (
        <Card key={m.id} title={m.name} testID={`meal-${m.name}`}>
          <MacroChips n={m.totals} />
          <Text v="small" num>Fibras {fmt(m.totals.fiber, 1)} g · Sódio {fmt(m.totals.micros.sodium ?? 0)} mg · Ferro {fmt(m.totals.micros.iron ?? 0, 1)} mg · Cálcio {fmt(m.totals.micros.calcium ?? 0)} mg</Text>
          <View style={{ gap: 4 }}>
            {m.items.map((i) => (
              <Row key={i.id} style={{ justifyContent: 'space-between' }}>
                <Text style={{ flex: 1 }} numberOfLines={1}>{i.foodName}</Text>
                <Text v="small" num>{fmt(i.grams)} g · {fmt(i.nutrition.kcal)} kcal</Text>
              </Row>
            ))}
          </View>
          {m.notes ? <Text v="small">{m.notes}</Text> : null}
          <Row gap={8}>
            <Button title="Editar" size="sm" onPress={() => router.push({ pathname: '/refeicoes/[id]', params: { id: String(m.id) } })} />
            <Button title="Remover" size="sm" variant="danger" accessibilityLabel={`Remover ${m.name}`} onPress={() => void remove(m.id, m.name)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
