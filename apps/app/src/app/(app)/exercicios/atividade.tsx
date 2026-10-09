import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { parseNumber } from '@personutri/shared';
import { useActivities } from '@/lib/queries';
import { useApi } from '@/lib/session';
import { Field } from '@/ui/fields';
import { Screen } from '@/ui/layout';
import { Banner, Button, Card, Text } from '@/ui/primitives';

export default function ActivityForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const acts = useActivities();
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const existing = id ? acts.data?.find((a) => a.id === Number(id)) : undefined;
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [met, setMet] = useState('');
  const [loaded, setLoaded] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const metN = parseNumber(met);

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name);
      setCategory(existing.category);
      setMet(existing.met != null ? String(existing.met) : '');
      setLoaded(true);
    }
  }, [existing, loaded]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = { name: name.trim(), category: category.trim(), met: metN };
      if (id) await api.patch(`/activities/${id}`, body);
      else await api.post('/activities', body);
      await qc.invalidateQueries({ queryKey: ['activities'] });
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Screen
      title={id ? 'Editar atividade' : 'Nova atividade'}
      back
      footer={<Button title="Salvar" variant="primary" loading={busy} disabled={name.trim().length < 2 || category.trim().length < 2 || !(metN >= 1 && metN <= 25)} onPress={save} />}
    >
      <Card>
        <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Futevôlei" maxLength={80} />
        <Field label="Categoria" value={category} onChangeText={setCategory} placeholder="Esportes" maxLength={60} />
        <Field label="MET (intensidade)" value={met} onChangeText={setMet} keyboardType="decimal-pad" placeholder="7,5" />
        <Text v="small">
          MET é quantas vezes o gasto de repouso a atividade exige: 3 = caminhada leve, 6 = musculação intensa, 10 = corrida a 10 km/h. Procure no Compendium of Physical Activities ou ajuste pela sua experiência. Calorias = MET × peso (kg) × horas.
        </Text>
        {error ? <Banner tone="bad">{error}</Banner> : null}
      </Card>
    </Screen>
  );
}
