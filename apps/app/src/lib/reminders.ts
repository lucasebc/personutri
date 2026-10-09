import { useEffect, useSyncExternalStore } from 'react';
import { REMINDERS_KEY } from './keys';
import { readJson, writeJson } from './storage';

export interface ReminderSettings {
  enabled: boolean;
  /** minutos de antecedência */
  lead: number;
}

let state: ReminderSettings = { enabled: false, lead: 10 };
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function load() {
  if (loaded) return;
  loaded = true;
  state = { ...state, ...(await readJson<Partial<ReminderSettings>>(REMINDERS_KEY, {})) };
  emit();
}

export async function setReminderSettings(patch: Partial<ReminderSettings>) {
  state = { ...state, ...patch };
  emit();
  await writeJson(REMINDERS_KEY, state);
}

export function useReminderSettings(): ReminderSettings {
  useEffect(() => void load(), []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
