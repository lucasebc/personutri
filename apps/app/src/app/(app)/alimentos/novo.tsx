import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { type MicroKey, MICRO_INFO, parseNumber } from '@personutri/shared';
import { useApi } from '@/lib/session';
import { Field } from '@/ui/fields';
import { Screen } from '@/ui/layout';
import { Banner, Button, Card, Row, Text } from '@/ui/primitives';

const MICRO_FORM: MicroKey[] = ['sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'zinc', 'vitaminC', 'vitaminA', 'sugars', 'saturatedFat'];

export default function NewFood() {
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '', servingGrams: '' });
  const [micros, setMicros] = useState<Partial<Record<MicroKey, string>>>({});
  const [showMicros, setShowMicros] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const opt = (s: string) => (s.trim() === '' ? undefined : parseNumber(s));

  async function save() {
    setBusy(true);
    setError(null);
    const m: Record<string, number> = {};
    for (const [k, v] of Object.entries(micros)) {
      const n = opt(v ?? '');
      if (n !== undefined && Number.isFinite(n)) m[k] = n;
    }
    try {
      const created = await api.post<{ id: number }>('/foods', {
        name: f.name.trim(),
        brand: f.brand.trim() || undefined,
        kcal: parseNumber(f.kcal),
        protein: opt(f.protein) ?? 0,
        carbs: opt(f.carbs) ?? 0,
        fat: opt(f.fat) ?? 0,
        fiber: opt(f.fiber),
        servingGrams: opt(f.servingGrams),
        micros: m,
      });
      await qc.invalidateQueries({ queryKey: ['foods'] });
      router.replace({ pathname: '/alimentos/detalhe', params: { id: String(created.id) } });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Screen title="Novo alimento" subtitle="Valores por 100 g (ou 100 ml), como no rótulo" back footer={<Button title="Salvar" variant="primary" loading={busy} disabled={f.name.trim().length < 2 || !Number.isFinite(parseNumber(f.kcal))} onPress={save} />}>
      <Card>
        <Field label="Nome" value={f.name} onChangeText={set('name')} placeholder="Ex.: Pão da padaria" maxLength={120} />
        <Field label="Marca (opcional)" value={f.brand} onChangeText={set('brand')} />
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Field label="Calorias (kcal)" value={f.kcal} onChangeText={set('kcal')} keyboardType="decimal-pad" />
          <Field label="Proteínas (g)" value={f.protein} onChangeText={set('protein')} keyboardType="decimal-pad" />
        </Row>
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Field label="Carboidratos (g)" value={f.carbs} onChangeText={set('carbs')} keyboardType="decimal-pad" />
          <Field label="Gorduras (g)" value={f.fat} onChangeText={set('fat')} keyboardType="decimal-pad" />
        </Row>
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Field label="Fibras (g)" value={f.fiber} onChangeText={set('fiber')} keyboardType="decimal-pad" />
          <Field label="Porção (g)" value={f.servingGrams} onChangeText={set('servingGrams')} keyboardType="decimal-pad" />
        </Row>
        <Button title={showMicros ? 'Ocultar micronutrientes' : 'Micronutrientes (opcional)'} size="sm" onPress={() => setShowMicros(!showMicros)} />
        {showMicros ? (
          <View style={{ gap: 10 }}>
            {MICRO_FORM.map((k) => (
              <Field key={k} label={`${MICRO_INFO[k].label} (${MICRO_INFO[k].unit})`} value={micros[k] ?? ''} onChangeText={(v) => setMicros({ ...micros, [k]: v })} keyboardType="decimal-pad" />
            ))}
          </View>
        ) : null}
        {error ? <Banner tone="bad">{error}</Banner> : null}
        <Text v="small">Cadastrar alimentos precisa de conexão com o servidor.</Text>
      </Card>
    </Screen>
  );
}
