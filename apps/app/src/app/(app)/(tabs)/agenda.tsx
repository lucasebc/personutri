import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { type DiaryEntryView, fmt, formatDateLong, ops, today } from '@personutri/shared';
import { MacroChips } from '@/features/bits';
import { useDashboardView, useDiaryView } from '@/lib/queries';
import { useOutbox } from '@/lib/outbox';
import { Check } from '@/ui/fields';
import { DateNav, Screen } from '@/ui/layout';
import { Badge, Banner, Bar, Button, Card, Empty, Loading, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

function EntryCard({ entry, date }: { entry: DiaryEntryView; date: string }) {
  const { submit } = useOutbox();
  const router = useRouter();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const done = entry.status === 'done';
  const skipped = entry.status === 'skipped';
  const setStatus = (status: 'pending' | 'done' | 'skipped') => submit(ops.diaryStatus(entry.id, date, status, entry.label));

  return (
    <View
      testID={`entry-${entry.label}`}
      style={{
        borderWidth: 1,
        borderColor: done ? colors.accent : colors.border,
        backgroundColor: done ? colors.accentSoft : colors.surface,
        borderRadius: 14,
        padding: 12,
        gap: 8,
        opacity: skipped ? 0.65 : 1,
      }}
    >
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        {entry.kind === 'planned' ? (
          <Check checked={done} accessibilityLabel={`Marcar ${entry.label} como feita`} onChange={(v) => setStatus(v ? 'done' : 'pending')} />
        ) : (
          <Badge label="LIVRE" />
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={8}>
            <Text v="bodyBold" style={[{ flex: 1 }, skipped ? { textDecorationLine: 'line-through' } : null]}>
              <Text v="small" num>{entry.time ?? '--:--'}  </Text>
              {entry.label}
            </Text>
            {entry.pendingSync ? <Badge label="a enviar" tone="warn" /> : null}
          </Row>
          <MacroChips n={entry.totals} />
          <Text v="small" numberOfLines={open ? undefined : 1}>{entry.items.map((i) => i.foodName).join(' · ')}</Text>
        </View>
      </Row>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <Button title={open ? 'Ocultar itens' : 'Ver itens'} size="sm" onPress={() => setOpen(!open)} />
        <Button title="Ajustar quantidades" size="sm" onPress={() => router.push({ pathname: '/agenda/ajustar', params: { entryId: String(entry.id), date } })} />
        {entry.kind === 'planned' && !skipped ? <Button title="Pular" size="sm" onPress={() => setStatus('skipped')} /> : null}
        {entry.kind === 'planned' && skipped ? <Button title="Desfazer" size="sm" onPress={() => setStatus('pending')} /> : null}
        {entry.kind === 'free' ? <Button title="Remover" size="sm" variant="danger" onPress={() => submit(ops.diaryDelete(entry.id, date, entry.label))} /> : null}
      </Row>
      {open ? (
        <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
          {entry.items.map((i) => (
            <Row key={`${i.foodId}-${i.id}`} style={{ justifyContent: 'space-between' }}>
              <Text style={{ flex: 1 }} numberOfLines={1}>{i.foodName}</Text>
              <Text v="small" num>{fmt(i.grams)} g · {fmt(i.nutrition.kcal)} kcal</Text>
            </Row>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function AgendaScreen() {
  const [date, setDate] = useState(today());
  const router = useRouter();
  const diary = useDiaryView(date);
  const dash = useDashboardView(date);
  const d = dash.data;

  return (
    <Screen
      title="Agenda"
      subtitle={formatDateLong(date)}
      right={<Button title="+ Consumo livre" variant="primary" size="sm" onPress={() => router.push({ pathname: '/agenda/livre', params: { date } })} />}
      onRefresh={() => void Promise.all([diary.refetch(), dash.refetch()])}
      refreshing={diary.isFetching && !diary.isLoading}
    >
      <DateNav date={date} onChange={setDate} />

      {d ? (
        <Card>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }} gap={12}>
            <View style={{ gap: 4, minWidth: 160 }}>
              <Text v="small">Consumido no dia{d.targets ? ' / meta' : ''}</Text>
              <Text v="big" num>{fmt(d.consumed.kcal)}{d.targets ? <Text v="body" muted> / {fmt(d.targets.kcal)} kcal</Text> : null}</Text>
              {d.targets ? <Bar value={d.consumed.kcal} max={d.targets.kcal} /> : null}
              {d.balance ? <Text v="small" num>{d.balance.status === 'deficit' ? 'Déficit' : d.balance.status === 'surplus' ? 'Superávit' : 'Manutenção'} parcial de {fmt(Math.abs(d.balance.vsTdee))} kcal vs gasto estimado</Text> : null}
            </View>
            <Row gap={14}>
              {(
                [
                  ['Prot.', d.macros.protein],
                  ['Carbo', d.macros.carbs],
                  ['Gord.', d.macros.fat],
                ] as const
              ).map(([name, m]) => (
                <View key={name}>
                  <Text v="small">{name}</Text>
                  <Text v="bodyBold" num>{fmt(m.consumed, 1)}{m.target ? <Text v="small"> /{fmt(m.target)}</Text> : null}</Text>
                </View>
              ))}
            </Row>
          </Row>
        </Card>
      ) : null}

      {diary.isLoading && !diary.entries ? <Loading /> : null}
      {diary.error && !diary.entries ? <Banner tone="bad">{(diary.error as Error).message}</Banner> : null}
      {diary.entries && diary.entries.length === 0 ? (
        <Empty>Nenhuma refeição neste dia. Cadastre uma dieta (em Mais → Dietas) para gerar a agenda, ou registre um consumo livre.</Empty>
      ) : null}
      {diary.entries?.map((e) => <EntryCard key={e.id} entry={e} date={date} />)}
    </Screen>
  );
}
