import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { type Dashboard, fmt, fmtSigned, formatDateLong, today, weekdayOf, WEEKDAYS } from '@personutri/shared';
import { BarsLines } from '@/charts/BarsLines';
import { Donut } from '@/charts/Donut';
import { Ring } from '@/charts/Ring';
import { useDashboardView } from '@/lib/queries';
import { Screen, DateNav } from '@/ui/layout';
import { Badge, Banner, Bar, Button, Card, Empty, Loading, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

const STATUS = { done: ['Feita', 'good'], pending: ['Pendente', 'warn'], skipped: ['Pulada', 'muted'] } as const;

function BalanceText({ b, label }: { b: NonNullable<Dashboard['balance']>; label: string }) {
  const { colors } = useTheme();
  const color = b.status === 'deficit' ? colors.good : b.status === 'surplus' ? colors.bad : colors.muted;
  const word = b.status === 'deficit' ? 'Déficit' : b.status === 'surplus' ? 'Superávit' : 'Manutenção';
  return (
    <View style={{ gap: 2 }}>
      <Text v="small">{label}</Text>
      <Text v="h2" color={color} num>{word}{b.status !== 'maintenance' ? ` de ${fmt(Math.abs(b.vsTdee))} kcal` : ''}</Text>
      <Text v="small" num>
        {fmtSigned(b.vsTdee)} kcal vs gasto estimado{b.status !== 'maintenance' ? ` · ≈ ${fmtSigned(b.weeklyKg, 2)} kg/semana se repetir` : ''}
      </Text>
    </View>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1 }}>
      <Text v="small">{label}</Text>
      <Text v="bodyBold" num>{value}</Text>
      {hint ? <Text v="small" num>{hint}</Text> : null}
    </View>
  );
}

export default function TodayScreen() {
  const [date, setDate] = useState(today());
  const router = useRouter();
  const { colors } = useTheme();
  const { data: d, error, isLoading, isFetching, refetchAll } = useDashboardView(date);

  return (
    <Screen title="Hoje" subtitle={formatDateLong(date)} onRefresh={() => void refetchAll()} refreshing={isFetching && !isLoading}>
      <DateNav date={date} onChange={setDate} />
      {isLoading && !d ? <Loading /> : null}
      {error && !d ? <Banner tone="bad">{(error as Error).message}</Banner> : null}

      {d ? (
        <>
          {!d.hasProfile || !d.hasWeight ? (
            <Banner tone="warn" action={<Button title="Cadastrar" size="sm" onPress={() => router.push('/corpo')} />}>
              Cadastre seus dados corporais para calcular metas e o déficit do dia.
            </Banner>
          ) : null}

          <Card title="Calorias">
            <Row gap={16} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              <Ring value={d.consumed.kcal} max={d.targets?.kcal ?? Math.max(d.projected.kcal, 1)} />
              <View style={{ flex: 1, minWidth: 200, gap: 12 }}>
                {d.balance ? <BalanceText b={d.balance} label="Até agora" /> : <Text v="small">Consumido: {fmt(d.consumed.kcal)} kcal</Text>}
                {d.projectedBalance && d.pending.kcal > 0 ? <BalanceText b={d.projectedBalance} label={`Se cumprir o que falta do plano (+${fmt(d.pending.kcal)} kcal)`} /> : null}
              </View>
            </Row>
            {d.energy && d.targets ? (
              <Row gap={12} style={{ flexWrap: 'wrap', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                <Stat label="Consumido" value={`${fmt(d.consumed.kcal)} kcal`} />
                <Stat label="Meta" value={`${fmt(d.targets.kcal)} kcal`} />
                <Stat label="Restante da meta" value={`${fmt(d.remainingKcal)} kcal`} />
                <Stat label="Gasto estimado (TDEE)" value={`${fmt(d.energy.tdee)} kcal`} hint={d.energy.exerciseKcal > 0 ? `base ${fmt(d.energy.baseTdee)} + treino ${fmt(d.energy.exerciseKcal)}` : undefined} />
              </Row>
            ) : null}
          </Card>

          <Card title="Distribuição das calorias">
            {d.consumed.kcal > 0 ? (
              <Row gap={16} style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                <Donut slices={[{ value: d.macros.protein.kcalPct ?? 0, color: colors.protein }, { value: d.macros.carbs.kcalPct ?? 0, color: colors.carbs }, { value: d.macros.fat.kcalPct ?? 0, color: colors.fat }]} />
                <View style={{ gap: 6, minWidth: 180 }}>
                  {(
                    [
                      ['Proteína', d.macros.protein, colors.protein],
                      ['Carboidrato', d.macros.carbs, colors.carbs],
                      ['Gordura', d.macros.fat, colors.fat],
                    ] as const
                  ).map(([name, m, color]) => (
                    <Row key={name} style={{ justifyContent: 'space-between' }}>
                      <Row gap={6}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                        <Text>{name}</Text>
                      </Row>
                      <Text v="small" num>{m.kcalPct}% · {fmt(m.consumed, 1)} g</Text>
                    </Row>
                  ))}
                </View>
              </Row>
            ) : (
              <Empty>Nada consumido ainda.</Empty>
            )}
          </Card>

          <Card title="Macronutrientes">
            {(
              [
                ['Proteína', d.macros.protein, colors.protein],
                ['Carboidratos', d.macros.carbs, colors.carbs],
                ['Gorduras', d.macros.fat, colors.fat],
                ['Fibras', d.macros.fiber, colors.fiber],
              ] as const
            ).map(([name, m, color]) => (
              <View key={name} style={{ gap: 5 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text v="bodyBold">{name}</Text>
                  <Text v="small" num>
                    <Text v="bodyBold" num>{fmt(m.consumed, 1)}</Text>
                    {m.target ? ` / ${fmt(m.target)} g` : ' g'}
                    {m.pct !== null ? ` · ${m.pct}%` : ''}
                  </Text>
                </Row>
                <Bar value={m.consumed} max={m.target ?? 0} color={color} over={name === 'Fibras' ? color : undefined} />
              </View>
            ))}
          </Card>

          <Card
            title="Exercício do dia"
            action={<Button title={d.exercise.sessions ? 'Ver treinos' : 'Registrar'} size="sm" onPress={() => router.push('/exercicios')} />}
          >
            {d.exercise.sessions === 0 ? (
              <Text v="small">Nenhum treino registrado neste dia.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                <Row gap={20}>
                  <Stat label="Treinos" value={String(d.exercise.sessions)} />
                  <Stat label="Tempo" value={`${fmt(d.exercise.minutes)} min`} />
                  <Stat label="Calorias ativas" value={`${fmt(d.exercise.netKcal)} kcal`} />
                </Row>
                {d.exercise.items.map((w) => (
                  <Row key={w.id} style={{ justifyContent: 'space-between' }}>
                    <Text style={{ flex: 1 }} numberOfLines={1}>{w.time ? `${w.time}  ` : ''}{w.name}</Text>
                    <Text v="small" num>{fmt(w.durationMin)} min · {w.netKcal === null ? 'sem cálculo' : `${fmt(w.netKcal)} kcal`}</Text>
                  </Row>
                ))}
              </View>
            )}
            <Text v="small">
              {d.exercise.counted ? 'As calorias ativas dos treinos estão somadas ao gasto do dia.' : 'Seu perfil usa fator de atividade fixo: os treinos são informativos e não alteram o gasto.'}
            </Text>
          </Card>

          <Card title="Últimos 7 dias">
            <BarsLines data={d.week.map((w) => ({ label: `${WEEKDAYS[weekdayOf(w.date)]} ${w.date.slice(8)}`, bar: w.consumed, tdee: w.tdee, target: w.target }))} />
            <Row gap={14} style={{ flexWrap: 'wrap' }}>
              <Row gap={5}><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.accent }} /><Text v="small">Consumido</Text></Row>
              <Row gap={5}><View style={{ width: 14, height: 3, backgroundColor: colors.fat }} /><Text v="small">Gasto (TDEE)</Text></Row>
              <Row gap={5}><View style={{ width: 14, height: 3, backgroundColor: colors.muted }} /><Text v="small">Meta</Text></Row>
            </Row>
          </Card>

          <Card title={`Refeições (${d.mealsDone}/${d.mealsTotal})`} action={<Button title="Abrir agenda" size="sm" onPress={() => router.push('/agenda')} />}>
            {d.meals.length === 0 ? (
              <Empty>Sem refeições neste dia. Ative uma dieta ou registre algo na agenda.</Empty>
            ) : (
              d.meals.map((m) => (
                <Row key={m.id} style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text v="bodyBold" numberOfLines={1} style={m.status === 'skipped' ? { textDecorationLine: 'line-through', opacity: 0.6 } : undefined}>{m.label}</Text>
                    <Text v="small" num>{m.time ?? '--:--'} · {fmt(m.kcal)} kcal{m.kind === 'free' ? ' · livre' : ''}</Text>
                  </View>
                  <Badge label={STATUS[m.status][0]} tone={STATUS[m.status][1]} />
                </Row>
              ))
            )}
          </Card>

          <Card title="Micronutrientes e limites">
            <Text v="small">Percentual das referências diárias para adultos (RDC 269/2005 e OMS). Verde = meta a atingir; âmbar = limite a não ultrapassar.</Text>
            {d.consumed.kcal === 0 ? (
              <Empty>Marque refeições como feitas ou registre algo para ver os micronutrientes.</Empty>
            ) : (
              d.micros.map((m) => {
                const limit = m.kind === 'max';
                const unknown = m.amount === null || m.pct === null;
                return (
                  <View key={m.key} style={{ gap: 4 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text>{m.label}{limit ? <Text v="small"> (limite)</Text> : null}</Text>
                      {unknown ? <Text v="small">sem dados nos alimentos</Text> : <Text v="small" num>{fmt(m.amount, m.reference < 5 ? 2 : 1)} {m.unit} · <Text v="bodyBold" num color={limit && m.pct! > 100 ? colors.bad : colors.text}>{m.pct}%</Text></Text>}
                    </Row>
                    <Bar value={m.amount ?? 0} max={m.reference} color={limit ? colors.warn : colors.good} over={limit ? colors.bad : colors.good} />
                  </View>
                );
              })
            )}
            <Text v="small">Micronutrientes refletem apenas o que já foi enviado ao servidor.</Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
