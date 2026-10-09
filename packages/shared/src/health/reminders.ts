export interface ReminderEntry {
  id: number;
  label: string;
  time: string; // HH:mm
  weekdays: number[]; // 0 = domingo … 6 = sábado
  mealName: string;
  kcal: number;
}

export interface PlannedReminder {
  /** Estável: permite substituir todos os lembretes ao mudar a dieta. */
  key: string;
  /** 1 = domingo … 7 = sábado (convenção do expo-notifications). */
  weekday: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

/** Lembretes semanais para as refeições da dieta ativa, `leadMinutes` antes do horário. */
export function planReminders(entries: ReminderEntry[], leadMinutes = 10): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const e of entries) {
    const [h, m] = e.time.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    for (const wd of e.weekdays) {
      let total = h * 60 + m - leadMinutes;
      let day = wd;
      if (total < 0) {
        total += 1440;
        day = (wd + 6) % 7;
      }
      out.push({
        key: `meal-${e.id}-${wd}`,
        weekday: day + 1,
        hour: Math.floor(total / 60),
        minute: total % 60,
        title: e.label,
        body: `${e.mealName} · ${Math.round(e.kcal)} kcal às ${e.time}`,
      });
    }
  }
  return out;
}
