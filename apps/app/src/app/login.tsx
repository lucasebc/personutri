import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { createApiClient, type HealthResponse, normalizeBaseUrl } from '@personutri/shared';
import { useSession } from '@/lib/session';
import { Screen } from '@/ui/layout';
import { Banner, Button, Card, Loading, Text } from '@/ui/primitives';
import { Field } from '@/ui/fields';

export default function LoginScreen() {
  const { ready, configured, unauthorized, baseUrl, save } = useSession();
  const router = useRouter();
  const { expired } = useLocalSearchParams<{ expired?: string }>();
  const [url, setUrl] = useState(baseUrl ?? '');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <Loading />;
  if (configured && !unauthorized) return <Redirect href="/" />;

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const base = normalizeBaseUrl(url);
      const probe = createApiClient({ baseUrl: () => base, token: () => token.trim() || null });
      const health = await probe.get<HealthResponse>('/health');
      if (health.authRequired) {
        if (!token.trim()) throw new Error('Este servidor exige um token de acesso.');
        await probe.get('/auth/check');
      }
      await save(url, health.authRequired ? token : null);
      router.replace('/');
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg === 'Token de acesso inválido ou ausente.' ? 'Token recusado. Confira o valor de API_TOKENS no servidor.' : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="PersoNutri" subtitle="Conecte ao seu servidor">
      {(expired || unauthorized) && <Banner tone="warn">O servidor recusou o token. Informe-o de novo.</Banner>}
      <Card>
        <Field
          label="Endereço do servidor"
          value={url}
          onChangeText={setUrl}
          placeholder="nutri.seudominio.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          hint="O app usa HTTPS. Não precisa digitar /api."
        />
        <Field label="Token de acesso" value={token} onChangeText={setToken} placeholder="API_TOKENS do servidor" autoCapitalize="none" autoCorrect={false} secureTextEntry />
        {error ? <Text v="small" color="#bf3a2b" accessibilityRole="alert">{error}</Text> : null}
        <View>
          <Button title="Conectar" variant="primary" loading={busy} disabled={url.trim().length < 3} onPress={connect} />
        </View>
      </Card>
    </Screen>
  );
}
