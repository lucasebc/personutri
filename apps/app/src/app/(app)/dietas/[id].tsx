import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { normalizeTime } from '@personutri/shared';
import { useDiets, useMeals } from '@/lib/queries';
import { useApi } from '@/lib/session';
import { Field, Select, WeekdayPicker } from '@/ui/fields';
import { Screen } from '@/ui/layout';
import { Banner, Button, Card, Loading, Row, Text } from '@/ui/primitives';

interface Draft {
  key: number;
  id?: number;
  mealId: number | '';
  label: string;
  time: string;
  weekdays: number[];
}

let seq = 0;
const ALL = [0, 1, 2, 3, 4, 5, 6];

export default function DietEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'novo';
  const diets = useDiets();
  const meals = useMeals();
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const diet = isNew ? null : diets.data?.find((d) => d.id === Number(id));
  const [name, setName] = useState('');
  const [entries, setEntries] = useState<Draft[]>([]);
  const [loaded, setLoaded] = useState(isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (diet && !loaded) {
      setName(diet.name);
      setEntries(diet.entries.map((e) => ({ key: ++seq, id: e.id, mealId: e.meal.id, label: e.label, time: e.time, weekdays: e.weekdays })));
      setLoaded(true);
    }
  }, [diet, loaded]);

  const patch = (key: number, p: Partial<Draft>) => setEntries(entries.map((e) => (e.key === key ? { ...e, ...p } : e)));
  const valid = name.trim().length >= 2 && entries.every((e) => e.mealId !== '' && e.label.trim() && normalizeTime(e.time) && e.weekdays.length > 0);

  async function save() {
    setBusy(true);
    setError(null);
    const body = {
      name: name.trim(),
      entries: entries.map((e) => ({ id: e.id, mealId: e.mealId as number, label: e.label.trim(), time: normalizeTime(e.time)!, weekdays: e.weekdays })),
    };
    try {
      if (isNew) await api.post('/diets', body);
      else await api.put(`/diets/${id}`, body);
      await qc.invalidateQueries();
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Screen title={isNew ? 'Nova dieta' : 'Editar dieta'} back footer={<Button title="Salvar" variant="primary" loading={busy} disabled={!valid} onPress={save} />}>
      {!loaded ? (
        <Loading />
      ) : (
        <>
          <Card>
            <Field label="Nome da dieta" value={name} onChangeText={setName} placeholder="Ex.: Cutting — semana normal" maxLength={80} />
          </Card>
          {meals.data?.length === 0 ? <Banner tone="warn">Você ainda não tem refeições cadastradas. Crie uma em Mais → Refeições.</Banner> : null}
          {entries.map((e) => (
            <Card key={e.key}>
              <Row gap={10} style={{ alignItems: 'flex-start' }}>
                <Field label="Nome no dia" value={e.label} onChangeText={(v) => patch(e.key, { label: v })} placeholder="Café da manhã" maxLength={60} />
                <View style={{ width: 92 }}>
                  <Field label="Horário" value={e.time} onChangeText={(v) => patch(e.key, { time: v })} keyboardType="numbers-and-punctuation" error={normalizeTime(e.time) ? null : 'Inválido'} />
                </View>
              </Row>
              <Select
                label="Refeição"
                value={e.mealId}
                options={(meals.data ?? []).map((m) => ({ value: m.id, label: `${m.name} (${Math.round(m.totals.kcal)} kcal)` }))}
                onChange={(v) => patch(e.key, { mealId: v })}
              />
              <WeekdayPicker value={e.weekdays} onChange={(v) => patch(e.key, { weekdays: v })} />
              <Button title="Remover da dieta" size="sm" variant="danger" onPress={() => setEntries(entries.filter((x) => x.key !== e.key))} />
            </Card>
          ))}
          <Button title="+ Adicionar refeição à dieta" onPress={() => setEntries([...entries, { key: ++seq, mealId: '', label: '', time: '12:00', weekdays: ALL }])} />
          {error ? <Banner tone="bad">{error}</Banner> : null}
          <Text v="small">Alterar a dieta atualiza as refeições pendentes da agenda; o que já foi marcado como feito ou pulado é mantido.</Text>
        </>
      )}
    </Screen>
  );
}
