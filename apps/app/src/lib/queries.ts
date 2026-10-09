import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  type Activity,
  type BodySummary,
  type Dashboard,
  type Diet,
  type DiaryEntry,
  type ForecastResult,
  type Meal,
  overlayDiary,
  overlayWeights,
  overlayWorkouts,
  applyPendingToDashboard,
  type WorkoutDay,
} from '@personutri/shared';
import { useOutbox } from './outbox';
import { qk } from './query';
import { useApi } from './session';
import type { ApiClient } from '@personutri/shared';

/** Leituras (com cache offline). As telas combinam com a fila de pendências pelos hooks *View. */
export function useDashboard(date: string) {
  const api = useApi();
  return useQuery({ queryKey: qk.dashboard(date), queryFn: ({ signal }) => api.get<Dashboard>(`/dashboard?date=${date}`, signal) });
}

export function useDiary(date: string) {
  const api = useApi();
  return useQuery({ queryKey: qk.diary(date), queryFn: ({ signal }) => api.get<{ date: string; entries: DiaryEntry[] }>(`/diary/${date}`, signal) });
}

export function useWorkoutsDay(date: string) {
  const api = useApi();
  return useQuery({ queryKey: qk.workouts(date), queryFn: ({ signal }) => api.get<WorkoutDay>(`/workouts?date=${date}`, signal) });
}

export function useActivities() {
  const api = useApi();
  return useQuery({ queryKey: qk.activities, queryFn: ({ signal }) => api.get<Activity[]>('/activities', signal), staleTime: 10 * 60_000 });
}

export function useMeals() {
  const api = useApi();
  return useQuery({ queryKey: qk.meals, queryFn: ({ signal }) => api.get<Meal[]>('/meals', signal) });
}

export function useDiets() {
  const api = useApi();
  return useQuery({ queryKey: qk.diets, queryFn: ({ signal }) => api.get<Diet[]>('/diets', signal) });
}

export function useBody() {
  const api = useApi();
  return useQuery({ queryKey: qk.body, queryFn: ({ signal }) => api.get<BodySummary>('/body', signal) });
}

export function useForecast() {
  const api = useApi();
  return useQuery({ queryKey: qk.forecast, queryFn: ({ signal }) => api.get<ForecastResult>('/forecast/weekly?weeks=12&ahead=4', signal) });
}

/** Agenda do dia já com as alterações ainda não enviadas. */
export function useDiaryView(date: string) {
  const q = useDiary(date);
  const { ops } = useOutbox();
  const entries = useMemo(() => (q.data ? overlayDiary(date, q.data.entries, ops) : q.data), [q.data, ops, date]);
  return { ...q, entries };
}

export function useWorkoutsView(date: string) {
  const q = useWorkoutsDay(date);
  const { ops } = useOutbox();
  const day = useMemo(() => (q.data || ops.length ? overlayWorkouts(date, q.data, ops) : undefined), [q.data, ops, date]);
  return { ...q, day };
}

export function useBodyView() {
  const q = useBody();
  const { ops } = useOutbox();
  const weights = useMemo(() => overlayWeights(q.data?.weights ?? [], ops), [q.data, ops]);
  return { ...q, weights };
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

/** Dashboard já ajustado pelas pendências (consumo livre e refeições marcadas offline). */
export function useDashboardView(date: string) {
  const dash = useDashboard(date);
  const diary = useDiaryView(date);
  const data = useMemo(
    () => (dash.data && diary.data && diary.entries ? applyPendingToDashboard(dash.data, diary.data.entries, diary.entries) : dash.data),
    [dash.data, diary.data, diary.entries],
  );
  return { ...dash, data, refetchAll: () => Promise.all([dash.refetch(), diary.refetch()]) };
}

/**
 * Pré-carrega o que as telas de registro precisam para funcionar sem internet (catálogo de atividades,
 * refeições, dietas, perfil/pesos e a previsão), para que existam no cache mesmo que você nunca tenha aberto a tela.
 */
export function prefetchEssentials(qc: QueryClient, api: ApiClient) {
  const opts = { staleTime: 5 * 60_000 };
  void qc.prefetchQuery({ queryKey: qk.activities, queryFn: () => api.get<Activity[]>('/activities'), ...opts });
  void qc.prefetchQuery({ queryKey: qk.meals, queryFn: () => api.get<Meal[]>('/meals'), ...opts });
  void qc.prefetchQuery({ queryKey: qk.diets, queryFn: () => api.get<Diet[]>('/diets'), ...opts });
  void qc.prefetchQuery({ queryKey: qk.body, queryFn: () => api.get<BodySummary>('/body'), ...opts });
  void qc.prefetchQuery({ queryKey: qk.forecast, queryFn: () => api.get<ForecastResult>('/forecast/weekly?weeks=12&ahead=4'), ...opts });
}
