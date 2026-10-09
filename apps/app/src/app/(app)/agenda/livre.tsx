import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { type EditableItem, fromItemView, itemsAreValid, nowTime, normalizeTime, ops, today } from '@personutri/shared';
import { ItemsEditor } from '@/features/ItemsEditor';
import { toPreview } from '@/features/preview';
import { useMeals } from '@/lib/queries';
import { useOutbox } from '@/lib/outbox';
import { Field, Select } from '@/ui/fields';
import { Screen } from '@/ui/layout';
import { Button, Card, Row } from '@/ui/primitives';

export default function FreeEntry() {
  const { date = today() } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();
  const { submit } = useOutbox();
  const meals = useMeals();
  const [label, setLabel] = useState('');
  const [time, setTime] = useState(nowTime());
  const [items, setItems] = useState<EditableItem[]>([]);
  const normTime = normalizeTime(time);
  const valid = itemsAreValid(items) && normTime !== null;

  return (
    <Screen
      title="Consumo livre"
      subtitle="Registre algo fora do plano"
      back
      footer={
        <Button
          title="Registrar"
          variant="primary"
          disabled={!valid}
          onPress={() => {
            submit(ops.diaryFree(date, label.trim(), normTime, toPreview(items)));
            router.back();
          }}
        />
      }
    >
      <Card>
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Field label="Descrição (opcional)" value={label} onChangeText={setLabel} placeholder="Ex.: Lanche fora de hora" maxLength={60} />
          <View style={{ width: 96 }}>
            <Field label="Horário" value={time} onChangeText={setTime} placeholder="HH:mm" keyboardType="numbers-and-punctuation" error={normTime ? null : 'Inválido'} />
          </View>
        </Row>
        {meals.data && meals.data.length > 0 ? (
          <Select
            label="Preencher com uma refeição cadastrada"
            value=""
            placeholder="Escolher…"
            options={meals.data.map((m) => ({ value: m.id, label: `${m.name} (${Math.round(m.totals.kcal)} kcal)` }))}
            onChange={(id) => {
              const meal = meals.data!.find((m) => m.id === id);
              if (!meal) return;
              setItems(meal.items.map(fromItemView));
              if (!label) setLabel(meal.name);
            }}
          />
        ) : null}
        <ItemsEditor items={items} onChange={setItems} />
      </Card>
    </Screen>
  );
}
