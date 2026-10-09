import { View } from 'react-native';
import { fmt, type Food } from '@personutri/shared';
import { Badge, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

export function MacroChips({ n }: { n: { kcal: number; protein: number; carbs: number; fat: number } }) {
  const { colors } = useTheme();
  return (
    <Row gap={10} style={{ flexWrap: 'wrap' }}>
      <Text v="bodyBold" num>{fmt(n.kcal)} kcal</Text>
      <Text v="small" num color={colors.protein}>P {fmt(n.protein, 1)}g</Text>
      <Text v="small" num color={colors.carbs}>C {fmt(n.carbs, 1)}g</Text>
      <Text v="small" num color={colors.fat}>G {fmt(n.fat, 1)}g</Text>
    </Row>
  );
}

export function SourceBadge({ source }: { source: Food['source'] }) {
  return source === 'taco' ? <Badge label="TACO" tone="good" /> : source === 'off' ? <Badge label="Open Food Facts" tone="warn" /> : <Badge label="Meu" />;
}

/** Linha de resultado de busca de alimento. */
export function FoodRowContent({ food }: { food: Food }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={12}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text v="bodyBold" numberOfLines={2}>{food.name}</Text>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <SourceBadge source={food.source} />
          {food.brand ? <Text v="small">{food.brand}</Text> : null}
        </Row>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text v="bodyBold" num>{fmt(food.kcal)} kcal</Text>
        <Text v="small" num>P {fmt(food.protein, 1)} · C {fmt(food.carbs, 1)} · G {fmt(food.fat, 1)}</Text>
        <Text v="small">por 100 g</Text>
      </View>
    </Row>
  );
}
