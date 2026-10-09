import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useState } from 'react';
import type { HealthResponse } from '@personutri/shared';
import { useOutbox } from '@/lib/outbox';
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
      <Text v="small">PersoNutri {Constants.expoConfig?.version ?? ''}</Text>
    </Screen>
  );
}
