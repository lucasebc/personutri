import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ApiError, type Food, type FoodSearch as FoodSearchResult } from '@personutri/shared';
import { useApi } from '@/lib/session';
import { Field, Segmented } from '@/ui/fields';
import { Banner, Button, Empty, Loading, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';
import { FoodRowContent } from './bits';
import { useRecents } from './recents';

type Tab = 'local' | 'off';
const isBarcode = (s: string) => /^\d{8,14}$/.test(s.trim());

/** Busca de alimentos: banco local (TACO + meus) ao digitar; Open Food Facts / código de barras ao enviar. */
export function FoodSearch({ onPick, onScan, initialTab = 'local' }: { onPick: (food: Food) => void; onScan?: () => void; initialTab?: Tab }) {
  const api = useApi();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [submitted, setSubmitted] = useState('');
  const { recents } = useRecents();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const remote = tab === 'off' || isBarcode(q);
  const term = remote ? submitted : debounced;
  const source = tab === 'off' && !isBarcode(term) ? 'off' : remote ? 'all' : 'local';

  const search = useQuery({
    queryKey: ['foods', source, term],
    enabled: term.length >= 2,
    staleTime: remote ? 10 * 60_000 : 30_000,
    queryFn: ({ signal }) => api.get<FoodSearchResult>(`/foods/search?source=${source}&limit=30&q=${encodeURIComponent(term)}`, signal),
  });

  const offline = search.error instanceof ApiError && search.error.network;
  const showRecents = !remote && debounced.length < 2 && recents.length > 0;

  return (
    <View style={{ gap: 12 }}>
      <Segmented
        value={tab}
        onChange={(t) => {
          setTab(t);
          setSubmitted('');
        }}
        options={[
          { value: 'local', label: 'Meus e TACO' },
          { value: 'off', label: 'Produtos (Open Food Facts)' },
        ]}
      />
      <Row gap={8} style={{ alignItems: 'flex-end' }}>
        <Field
          value={q}
          onChangeText={setQ}
          placeholder={tab === 'local' ? 'Ex.: arroz integral, banana…' : 'Nome do produto ou código de barras'}
          accessibilityLabel="Buscar alimento"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => setSubmitted(q.trim())}
        />
        {remote ? <Button title="Buscar" variant="primary" disabled={q.trim().length < 2} onPress={() => setSubmitted(q.trim())} /> : null}
        {onScan ? <Button title="📷" accessibilityLabel="Ler código de barras" onPress={onScan} /> : null}
      </Row>

      {offline ? <Banner tone="warn">Sem conexão: a busca precisa do servidor. Use os alimentos recentes abaixo.</Banner> : null}
      {search.data?.offError ? <Banner tone="warn">{`${search.data.offError} Mostrando só o que já está salvo.`}</Banner> : null}
      {search.error && !offline ? <Banner tone="bad">{(search.error as Error).message}</Banner> : null}
      {search.isFetching && term.length >= 2 ? <Loading label="Buscando…" /> : null}

      {(search.data?.foods ?? []).map((f) => (
        <Pressable key={f.id} accessibilityRole="button" accessibilityLabel={f.name} onPress={() => onPick(f)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: colors.surface }}>
          <FoodRowContent food={f} />
        </Pressable>
      ))}

      {showRecents ? (
        <View style={{ gap: 8 }}>
          <Text v="label">Usados recentemente</Text>
          {recents.map((f) => (
            <Pressable key={f.id} accessibilityRole="button" accessibilityLabel={f.name} onPress={() => onPick(f)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: colors.surface }}>
              <FoodRowContent food={f} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {!search.isFetching && term.length >= 2 && !search.error && search.data?.foods.length === 0 ? <Empty>Nada encontrado. Tente outro termo{tab === 'local' ? ' ou a aba de produtos.' : '.'}</Empty> : null}
      {!search.isFetching && !showRecents && term.length < 2 ? (
        <Empty>
          {tab === 'off' ? 'Digite o nome de um produto (ou o código de barras) e toque em Buscar. Os resultados vêm do Open Food Facts, filtrados para o Brasil.' : 'Digite pelo menos 2 letras.'}
        </Empty>
      ) : null}
    </View>
  );
}
