import * as Notifications from 'expo-notifications';
import type { PlannedReminder } from '@personutri/shared';

export const remindersSupported = true;
const CHANNEL = 'refeicoes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Cria o canal e pede a permissão (Android 13+). */
export async function ensureReminderPermission(): Promise<boolean> {
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Lembretes de refeição', importance: Notifications.AndroidImportance.DEFAULT });
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Substitui todos os lembretes pelos da lista (um por refeição e dia da semana, repetindo toda semana). */
export async function applyReminders(list: PlannedReminder[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of list) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.key,
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: r.weekday, hour: r.hour, minute: r.minute, channelId: CHANNEL },
    });
  }
}

export const clearReminders = () => Notifications.cancelAllScheduledNotificationsAsync();
