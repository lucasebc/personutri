import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { fmt } from '@personutri/shared';
import { useActivities } from '@/lib/queries';
import { useApi } from '@/lib/session';
import { Field } from '@/ui/fields';
import { Screen } from '@/ui/layout';
import { Badge, Banner, Button, Card, Empty, Loading, Row, Text } from '@/ui/primitives';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Catalog() {
  const acts = useActivities();
  const router = useRouter();
  const api = useApi();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const list = (acts.data ?? []).filter((a) => norm(`${a.name} ${a.category}`).includes(norm(q)));
  const groups = [...new Set(list.map((a) => a.category))];

  return (
    <Screen
      title="Catálogo"
      subtitle="Atividades e intensidade (MET)"
      back
      right={<Button title="+ Nova" variant="primary" size="sm" onPress={() => router.push('/exercicios/atividade')} />}
    >
      <Field value={q} onChangeText={setQ} placeholder="Buscar atividade…" accessibilityLabel="Buscar atividade" />
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {acts.isLoading ? <Loading /> : null}
      {acts.data && list.length === 0 ? <Empty>Nenhuma atividade encontrada.</Empty> : null}
      {groups.map((g) => (
        <Card key={g} title={g}>
          {list
            .filter((a) => a.category === g)
            .map((a) => (
              <View key={a.id} style={{ gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }} gap={8}>
                  <Row gap={6} style={{ flex: 1 }}>
                    <Text style={{ flexShrink: 1 }}>{a.name}</Text>
                    {!a.builtin ? <Badge label="minha" /> : null}
                  </Row>
                  <Text v="small" num>{a.calcMode === 'met' ? `${fmt(a.met, 1)} MET` : 'por velocidade'}</Text>
                </Row>
                {!a.builtin ? (
                  <Row gap={8}>
                    <Button title="Editar" size="sm" onPress={() => router.push({ pathname: '/exercicios/atividade', params: { id: String(a.id) } })} />
                    <Button
                      title="Remover"
                      size="sm"
                      variant="danger"
                      accessibilityLabel={`Remover ${a.name}`}
                      onPress={async () => {
                        try {
                          await api.del(`/activities/${a.id}`);
                          setError(null);
                          await qc.invalidateQueries({ queryKey: ['activities'] });
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    />
                  </Row>
                ) : null}
              </View>
            ))}
        </Card>
      ))}
      <Text v="small">Valores de MET aproximados do Compendium of Physical Activities (Ainsworth et al., 2011). Caminhada, corrida e ciclismo são calculados pela velocidade.</Text>
    </Screen>
  );
}
