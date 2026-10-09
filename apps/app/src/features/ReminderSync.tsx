import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { planReminders } from '@personutri/shared';
import { useDiets } from '@/lib/queries';
import { useReminderSettings } from '@/lib/reminders';
import { applyReminders, clearReminders, remindersSupported } from '@/native/notifications';

const APPLIED_KEY = 'personutri:reminders-applied';

/** Mantém os lembretes locais em dia com a dieta ativa (reagenda só quando algo muda). */
export function ReminderSync() {
  const { enabled, lead } = useReminderSettings();
  const diets = useDiets();

  useEffect(() => {
    if (!remindersSupported) return;
    (async () => {
      if (!enabled) {
        if ((await AsyncStorage.getItem(APPLIED_KEY)) !== null) {
          await clearReminders();
          await AsyncStorage.removeItem(APPLIED_KEY);
        }
        return;
      }
      const active = diets.data?.find((d) => d.active);
      if (!active) return; // sem dados (ainda): mantém o que já está agendado
      const plan = planReminders(
        active.entries.map((e) => ({ id: e.id, label: e.label, time: e.time, weekdays: e.weekdays, mealName: e.meal.name, kcal: e.meal.totals.kcal })),
        lead,
      );
      const signature = JSON.stringify(plan);
      if ((await AsyncStorage.getItem(APPLIED_KEY)) === signature) return;
      await applyReminders(plan);
      await AsyncStorage.setItem(APPLIED_KEY, signature);
    })().catch(() => {});
  }, [enabled, lead, diets.data]);

  return null;
}
