import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { type ReactNode, useEffect, useState } from 'react';
import { ApiError } from '@personutri/shared';

const WEEK = 7 * 24 * 3600 * 1000;
/** Mude ao alterar o formato dos dados em cache. */
const CACHE_VERSION = 'v1';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Offline, mostra o que está em cache em vez de ficar "pausado".
        networkMode: 'offlineFirst',
        staleTime: 20_000,
        gcTime: WEEK,
        retry: (count, err) => !(err instanceof ApiError && (err.network || err.status < 500)) && count < 1,
      },
    },
  });
}

export function QueryProvider({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [qc] = useState(() => client ?? makeQueryClient());
  const [persister] = useState(() => createAsyncStoragePersister({ storage: AsyncStorage, key: 'personutri-cache', throttleTime: 1000 }));

  useEffect(() => {
    // O app decide sozinho o que fazer sem conexão (cache + fila): o React Query nunca deve "pausar" as consultas.
    onlineManager.setOnline(true);
    onlineManager.setEventListener(() => () => {});
  }, []);

  return (
    <PersistQueryClientProvider client={qc} persistOptions={{ persister, maxAge: WEEK, buster: CACHE_VERSION }}>
      {children}
    </PersistQueryClientProvider>
  );
}

/** Chaves das consultas (usadas também para invalidar após a fila offline). */
export const qk = {
  dashboard: (date: string) => ['dashboard', date] as const,
  diary: (date: string) => ['diary', date] as const,
  workouts: (date: string) => ['workouts', date] as const,
  activities: ['activities'] as const,
  meals: ['meals'] as const,
  diets: ['diets'] as const,
  body: ['body'] as const,
  forecast: ['forecast'] as const,
};
