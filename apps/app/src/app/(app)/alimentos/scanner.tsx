import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ApiError, type Food } from '@personutri/shared';
import { setScanned } from '@/features/picker';
import { ScannerView } from '@/features/ScannerView';
import { useApi } from '@/lib/session';
import { Screen } from '@/ui/layout';
import { Banner, Loading, Text } from '@/ui/primitives';

export default function ScannerScreen() {
  const api = useApi();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onCode(code: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const food = await api.get<Food>(`/foods/barcode/${encodeURIComponent(code)}`);
      setScanned(food);
      router.back();
    } catch (e) {
      const err = e as ApiError;
      setMessage(err.status === 404 ? `Produto ${code} não encontrado no Open Food Facts. Cadastre-o manualmente em Alimentos → Novo.` : err.network ? 'Sem conexão: a leitura precisa do servidor.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Ler código de barras" subtitle="Aponte para o código EAN do produto" back>
      <ScannerView onCode={onCode} />
      {busy ? <Loading label="Buscando produto…" /> : null}
      {message ? <Banner tone="warn">{message}</Banner> : null}
      <Text v="small">Os dados vêm do Open Food Facts e podem estar incompletos: confira os valores antes de usar.</Text>
    </Screen>
  );
}
