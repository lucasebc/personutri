import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { prefetchEssentials } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { Loading } from '@/ui/primitives';

/** Tudo dentro de (app) exige servidor configurado e token aceito. */
export default function AppLayout() {
  const { ready, configured, unauthorized, client, reachable } = useSession();
  const qc = useQueryClient();

  // ao abrir (e quando o servidor volta a responder) deixa os dados essenciais em cache para uso offline
  useEffect(() => {
    if (ready && configured && !unauthorized && reachable !== false) prefetchEssentials(qc, client);
  }, [ready, configured, unauthorized, reachable, qc, client]);

  if (!ready) return <Loading />;
  if (!configured || unauthorized) return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
