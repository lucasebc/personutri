import { Stack } from 'expo-router';
import '@/native/health-task'; // registra a tarefa em segundo plano no escopo global
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OutboxProvider } from '@/lib/outbox';
import { QueryProvider } from '@/lib/query';
import { SessionProvider } from '@/lib/session';
import { ThemeProvider, useTheme } from '@/ui/theme';

function ThemedStatusBar() {
  const { dark } = useTheme();
  return <StatusBar style={dark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <QueryProvider>
            <OutboxProvider>
              <ThemedStatusBar />
              <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }} />
            </OutboxProvider>
          </QueryProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
