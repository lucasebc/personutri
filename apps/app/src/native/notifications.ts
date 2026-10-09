import type { PlannedReminder } from '@personutri/shared';

/** Lembretes locais só no Android. */
export const remindersSupported = false;
export const ensureReminderPermission = async (): Promise<boolean> => false;
export const applyReminders = async (_list: PlannedReminder[]): Promise<void> => {};
export const clearReminders = async (): Promise<void> => {};
