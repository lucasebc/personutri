import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { type Food, fmt, MICRO_INFO, MICRO_KEYS } from '@personutri/shared';
import { SourceBadge } from '@/features/bits';
import { useApi } from '@/lib/session';
import { Screen } from '@/ui/layout';
import { Banner, Button, Card, Divider, Loading, Row, Text } from '@/ui/primitives';

export default function FoodDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['food', id], queryFn: ({ signal }) => api.get<Food>(`/foods/${id}`, signal) });
  const f = q.data;
  const micros = f ? MICRO_KEYS.filter((k) => f.micros[k] !== undefined) : [];

  const rows: Array<[string, string]> = f
    ? [
        ['Calorias', `${fmt(f.kcal)} kcal`],
        ['Proteínas', `${fmt(f.protein, 1)} g`],
        ['Carboidratos', `${fmt(f.carbs, 1)} g`],
        ['Gorduras', `${fmt(f.fat, 1)} g`],
        ['Fibras', `${fmt(f.fiber, 1)} g`],
        ...micros.map((k): [string, string] => [MICRO_INFO[k].label, `${fmt(f.micros[k]!, f.micros[k]! < 5 ? 2 : 1)} ${MICRO_INFO[k].unit}`]),
      ]
    : [];

  return (
    <Screen title={f?.name ?? 'Alimento'} back>
      {q.isLoading ? <Loading /> : null}
      {q.error ? <Banner tone="bad">{(q.error as Error).message}</Banner> : null}
      {f ? (
        <Card>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <SourceBadge source={f.source} />
            {f.brand ? <Text v="small">{f.brand}</Text> : null}
            {f.category ? <Text v="small">{f.category}</Text> : null}
            {f.barcode ? <Text v="small" num>EAN {f.barcode}</Text> : null}
          </Row>
          <Text v="small">Valores por 100 g</Text>
          <View>
            {rows.map(([k, v], i) => (
              <View key={k}>
                {i > 0 ? <Divider /> : null}
                <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
                  <Text muted>{k}</Text>
                  <Text v="bodyBold" num>{v}</Text>
                </Row>
              </View>
            ))}
          </View>
          {micros.length === 0 ? <Text v="small">Sem micronutrientes cadastrados para este alimento.</Text> : null}
          {f.servingGrams ? <Text v="small">Porção do rótulo: {fmt(f.servingGrams)} g{f.servingLabel ? ` (${f.servingLabel})` : ''}</Text> : null}
          {error ? <Banner tone="bad">{error}</Banner> : null}
          {f.source === 'custom' ? (
            <Button
              title="Remover alimento"
              variant="danger"
              onPress={async () => {
                try {
                  await api.del(`/foods/${f.id}`);
                  await qc.invalidateQueries({ queryKey: ['foods'] });
                  router.back();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
