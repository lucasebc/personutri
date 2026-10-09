import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useOutbox } from '@/lib/outbox';
import { Screen } from '@/ui/layout';
import { Badge, Card, Row, Text } from '@/ui/primitives';
import { useTheme } from '@/ui/theme';

export default function MoreScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { pending, failed } = useOutbox();
  const items: Array<{ glyph: string; title: string; hint: string; href: string; badge?: string }> = [
    { glyph: '🍽️', title: 'Refeições', hint: 'Combinações de alimentos', href: '/refeicoes' },
    { glyph: '📋', title: 'Dietas', hint: 'Agenda semanal das refeições', href: '/dietas' },
    { glyph: '🥑', title: 'Alimentos', hint: 'TACO, Open Food Facts e código de barras', href: '/alimentos' },
    { glyph: '⌚', title: 'Relógio (Health Connect)', hint: 'Importar treinos e peso do Galaxy Watch', href: '/sincronizacao' },
    { glyph: '🕓', title: 'Pendências', hint: 'Registros feitos offline aguardando envio', href: '/pendencias', badge: failed.length ? `${failed.length} recusada(s)` : pending ? `${pending} a enviar` : undefined },
    { glyph: '⚙️', title: 'Configurações', hint: 'Servidor, tema e lembretes', href: '/configuracoes' },
  ];
  return (
    <Screen title="Mais">
      <Card style={{ padding: 0 }}>
        {items.map((it, i) => (
          <Pressable
            key={it.href}
            accessibilityRole="button"
            accessibilityLabel={it.title}
            onPress={() => router.push(it.href as never)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
          >
            <Text style={{ fontSize: 22 }}>{it.glyph}</Text>
            <View style={{ flex: 1 }}>
              <Text v="bodyBold">{it.title}</Text>
              <Text v="small">{it.hint}</Text>
            </View>
            <Row gap={8}>
              {it.badge ? <Badge label={it.badge} tone={failed.length ? 'bad' : 'warn'} /> : null}
              <Text color={colors.muted}>›</Text>
            </Row>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
