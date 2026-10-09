import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useOutbox } from '@/lib/outbox';
import { useTheme } from '@/ui/theme';

const icon = (glyph: string) =>
  function TabIcon() {
    return <Text style={{ fontSize: 20 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const { colors } = useTheme();
  const { pending } = useOutbox();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarIcon: icon('📊'), tabBarAccessibilityLabel: 'Hoje' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: icon('🗓️'), tabBarAccessibilityLabel: 'Agenda' }} />
      <Tabs.Screen name="exercicios" options={{ title: 'Exercícios', tabBarIcon: icon('🏃'), tabBarAccessibilityLabel: 'Exercícios' }} />
      <Tabs.Screen name="corpo" options={{ title: 'Corpo', tabBarIcon: icon('⚖️'), tabBarAccessibilityLabel: 'Corpo' }} />
      <Tabs.Screen
        name="mais"
        options={{ title: 'Mais', tabBarIcon: icon('☰'), tabBarAccessibilityLabel: 'Mais', tabBarBadge: pending > 0 ? pending : undefined }}
      />
    </Tabs>
  );
}
