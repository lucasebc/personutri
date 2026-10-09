import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, formatDateBr, formatDateLong, today } from '@personutri/shared';
import { SyncStatus } from '@/features/SyncStatus';
import { Button, Row, Text } from './primitives';
import { useTheme } from './theme';

/** Tela com cabeçalho próprio, rolagem e "puxar para atualizar". */
export function Screen({
  title,
  subtitle,
  back,
  right,
  children,
  onRefresh,
  refreshing,
  scroll = true,
  footer,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const header = (
    <View style={{ gap: 8, paddingBottom: 6 }}>
      <SyncStatus />
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Row style={{ flex: 1, alignItems: 'flex-start' }} gap={10}>
          {back ? <Button title="←" accessibilityLabel="Voltar" size="sm" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : null}
          <View style={{ flex: 1 }}>
            <Text v="title" accessibilityRole="header">{title}</Text>
            {subtitle ? <Text v="small" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
          </View>
        </Row>
        {right}
      </Row>
    </View>
  );
  const pad = { paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 24, gap: 14, maxWidth: 760, width: '100%' as const, alignSelf: 'center' as const };
  return (
    <View testID={`screen-${title}`} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={pad}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[pad, { flex: 1 }]}>
          {header}
          {children}
        </View>
      )}
      {footer ? <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, padding: 12, paddingBottom: 12 + insets.bottom }}>{footer}</View> : null}
    </View>
  );
}

export function DateNav({ date, onChange, long = true }: { date: string; onChange: (d: string) => void; long?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between' }} gap={8}>
      <Button title="←" accessibilityLabel="Dia anterior" size="sm" onPress={() => onChange(addDays(date, -1))} />
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text v="bodyBold" accessibilityLabel={`Data: ${formatDateBr(date)}`}>{formatDateBr(date)}</Text>
        {long ? <Text v="small">{formatDateLong(date).split(',')[0]}</Text> : null}
      </View>
      {date !== today() ? <Button title="Hoje" accessibilityLabel="Ir para hoje" size="sm" onPress={() => onChange(today())} /> : null}
      <Button title="→" accessibilityLabel="Próximo dia" size="sm" onPress={() => onChange(addDays(date, 1))} />
    </Row>
  );
}
