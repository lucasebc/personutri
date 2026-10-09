import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useState } from 'react';
import type { HealthResponse } from '@personutri/shared';
import { useOutbox } from '@/lib/outbox';
import { setReminderSettings, useReminderSettings } from '@/lib/reminders';
import { ensureReminderPermission, remindersSupported } from '@/native/notifications';
import { useSession } from '@/lib/session';
import { Segmented } from '@/ui/fields';
import { Screen } from '@/ui/layout';
import { Banner, Button, Card, Text } from '@/ui/primitives';
import { type ThemePref, useTheme } from '@/ui/theme';

export default function Settings() {
  const { baseUrl, client, logout } = useSession();
  const { pref, setPref } = useTheme();
  const { pending } = useOutbox();
  const qc = useQueryClient();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const reminders = useReminderSettings();
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  return (
    <Screen title="Configurações" back>
      <Card title="Servidor">
        <Text selectable>{baseUrl}</Text>
        <Button
          title="Testar conexão"
          size="sm"
          onPress={async () => {
            try {
              const h = await client.get<HealthResponse>('/health');
              setStatus(`Conectado (${new Date(h.time).toLocaleTimeString('pt-BR')})${h.authRequired ? ' · token exigido' : ''}`);
            } catch (e) {
              setStatus((e as Error).message);
            }
          }}
        />
        {status ? <Text v="small">{status}</Text> : null}
        {pending > 0 ? <Banner tone="warn">{`Há ${pending} registro(s) aguardando envio. Sair não os apaga, mas eles só serão enviados depois de conectar de novo.`}</Banner> : null}
        <Button
          title="Sair (trocar servidor ou token)"
          variant="danger"
          onPress={async () => {
            await logout();
            qc.clear();
            router.replace('/login');
          }}
        />
      </Card>
      <Card title="Aparência">
        <Segmented<ThemePref>
          value={pref}
          onChange={setPref}
          options={[
            { value: 'system', label: 'Automático' },
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Escuro' },
          ]}
        />
      </Card>
      <Card title="Lembretes de refeição">
        {remindersSupported ? (
          <>
            <Text v="small">Notificações no horário das refeições da dieta ativa, sem precisar de internet.</Text>
            <Segmented<'on' | 'off'>
              value={reminders.enabled ? 'on' : 'off'}
              onChange={async (v) => {
                if (v === 'on') {
                  const ok = await ensureReminderPermission();
                  setReminderMsg(ok ? null : 'Permita notificações para o PersoNutri nas configurações do Android.');
                  await setReminderSettings({ enabled: ok });
                } else {
                  setReminderMsg(null);
                  await setReminderSettings({ enabled: false });
                }
              }}
              options={[
                { value: 'off', label: 'Desligados' },
                { value: 'on', label: 'Ligados' },
              ]}
            />
            {reminders.enabled ? (
              <Segmented<string>
                value={String(reminders.lead)}
                onChange={(v) => void setReminderSettings({ lead: Number(v) })}
                options={[
                  { value: '0', label: 'No horário' },
                  { value: '10', label: '10 min antes' },
                  { value: '30', label: '30 min antes' },
                ]}
              />
            ) : null}
            {reminderMsg ? <Banner tone="warn">{reminderMsg}</Banner> : null}
          </>
        ) : (
          <Text v="small">Disponível apenas no app Android.</Text>
        )}
      </Card>
      <Text v="small">PersoNutri {Constants.expoConfig?.version ?? ''}</Text>
    </Screen>
  );
}
