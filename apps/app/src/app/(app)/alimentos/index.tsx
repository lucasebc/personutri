import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FoodSearch } from '@/features/FoodSearch';
import { takeScanned } from '@/features/picker';
import { Screen } from '@/ui/layout';
import { Button } from '@/ui/primitives';

export default function FoodsScreen() {
  const router = useRouter();
  // produto lido pelo leitor de código de barras → abre o detalhe
  useFocusEffect(
    useCallback(() => {
      const f = takeScanned();
      if (f) router.push({ pathname: '/alimentos/detalhe', params: { id: String(f.id) } });
    }, [router]),
  );
  return (
    <Screen
      title="Alimentos"
      subtitle="TACO (genéricos brasileiros) e Open Food Facts (produtos)"
      back
      right={<Button title="+ Novo" variant="primary" size="sm" onPress={() => router.push('/alimentos/novo')} />}
    >
      <FoodSearch onPick={(f) => router.push({ pathname: '/alimentos/detalhe', params: { id: String(f.id) } })} onScan={() => router.push('/alimentos/scanner')} />
    </Screen>
  );
}
