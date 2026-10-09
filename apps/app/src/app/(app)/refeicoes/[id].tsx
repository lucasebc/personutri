import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { type EditableItem, fromItemView, itemsAreValid } from '@personutri/shared';
import { ItemsEditor } from '@/features/ItemsEditor';
import { toInputsOf } from '@/features/inputs';
import { useMeals } from '@/lib/queries';
import { useApi } from '@/lib/session';
import { Field } from '@/ui/fields';
import { Screen } from '@/ui/layout';
import { Banner, Button, Card, Loading } from '@/ui/primitives';

export default function MealEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'novo';
  const meals = useMeals();
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const meal = isNew ? null : meals.data?.find((m) => m.id === Number(id));
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loaded, setLoaded] = useState(isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (meal && !loaded) {
      setName(meal.name);
      setNotes(meal.notes ?? '');
      setItems(meal.items.map(fromItemView));
      setLoaded(true);
    }
  }, [meal, loaded]);

  async function save() {
    setBusy(true);
    setError(null);
    const body = { name: name.trim(), notes: notes.trim() || undefined, items: toInputsOf(items) };
    try {
      if (isNew) await api.post('/meals', body);
      else await api.put(`/meals/${id}`, body);
      await qc.invalidateQueries();
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Screen title={isNew ? 'Nova refeição' : 'Editar refeição'} back footer={<Button title="Salvar" variant="primary" loading={busy} disabled={name.trim().length < 2 || !itemsAreValid(items)} onPress={save} />}>
      {!loaded ? (
        <Loading />
      ) : (
        <Card>
          <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Almoço padrão" maxLength={80} />
          <Field label="Observações (opcional)" value={notes} onChangeText={setNotes} maxLength={300} />
          <ItemsEditor items={items} onChange={setItems} />
          {error ? <Banner tone="bad">{error}</Banner> : null}
        </Card>
      )}
    </Screen>
  );
}
