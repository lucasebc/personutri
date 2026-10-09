import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  type WorkoutDay,
} from '@personutri/shared';
import { useOutbox } from './outbox';
import { qk } from './query';
import { useApi } from './session';

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
