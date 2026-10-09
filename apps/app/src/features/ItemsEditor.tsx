import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { type EditableItem, fmt, fromFood, parseNumber, totalsOf } from '@personutri/shared';
import { Button, Empty, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { MacroChips } from './bits';
import { addRecent } from './recents';
import { pickFood } from './picker';

function GramsInput({ item, onChange }: { item: EditableItem; onChange: (grams: number) => void }) {
  const { colors } = useTheme();
  const [text, setText] = useState(String(item.grams));
  const invalid = !Number.isFinite(item.grams) || item.grams < 1 || item.grams > 10000;
  return (
    <TextInput
      accessibilityLabel={`Gramas de ${item.name}`}
      value={text}
      onChangeText={(t) => {
        setText(t);
        onChange(parseNumber(t));
      }}
      keyboardType="decimal-pad"
      selectTextOnFocus
      style={{ width: 70, minHeight: 40, textAlign: 'right', color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: invalid ? colors.bad : colors.border, borderRadius: 8, paddingHorizontal: 8 }}
    />
  );
}

/** Lista editável de alimentos com gramas e totais; "Adicionar" abre a busca (ou o leitor de código de barras). */
export function ItemsEditor({ items, onChange }: { items: EditableItem[]; onChange: (items: EditableItem[]) => void }) {
  const router = useRouter();
  const { colors } = useTheme();
  const latest = useRef(items);
  latest.current = items;
  const setGrams = (key: string, grams: number) => onChange(items.map((i) => (i.key === key ? { ...i, grams } : i)));

  return (
    <View style={{ gap: 10 }}>
      {items.length === 0 ? <Empty>Nenhum alimento ainda.</Empty> : null}
      {items.map((i) => (
        <View key={i.key} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }} gap={10}>
            <View style={{ flex: 1 }}>
              <Text v="bodyBold" numberOfLines={2}>{i.name}</Text>
              <Text v="small" num>{i.brand ? `${i.brand} · ` : ''}{fmt((i.per100.kcal * (Number.isFinite(i.grams) ? i.grams : 0)) / 100)} kcal</Text>
            </View>
            <GramsInput item={i} onChange={(g) => setGrams(i.key, g)} />
            <Text v="small">g</Text>
          </Row>
          <Row gap={8}>
            {i.servingGrams && i.servingGrams !== i.grams ? <Button title={`Porção (${fmt(i.servingGrams)} g)`} size="sm" onPress={() => setGrams(i.key, i.servingGrams!)} /> : null}
            <Button title="Remover" size="sm" variant="danger" accessibilityLabel={`Remover ${i.name}`} onPress={() => onChange(items.filter((x) => x.key !== i.key))} />
          </Row>
        </View>
      ))}
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }} gap={10}>
        <Button
          title="+ Adicionar alimento"
          onPress={() =>
            pickFood(router, (food) => {
              void addRecent(food);
              onChange([...latest.current, fromFood(food)]);
            })
          }
        />
        {items.length > 0 ? <MacroChips n={totalsOf(items.filter((i) => Number.isFinite(i.grams)))} /> : null}
      </Row>
    </View>
  );
}
