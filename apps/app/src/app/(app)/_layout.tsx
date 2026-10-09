import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/lib/session';
import { Loading } from '@/ui/primitives';

/** Tudo dentro de (app) exige servidor configurado e token aceito. */
export default function AppLayout() {
  const { ready, configured, unauthorized } = useSession();
  if (!ready) return <Loading />;
  if (!configured || unauthorized) return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
