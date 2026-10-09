import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { cancelPick, deliverPick, takeScanned } from '@/features/picker';
import { FoodSearch } from '@/features/FoodSearch';
import { Screen } from '@/ui/layout';
import type { Food } from '@personutri/shared';

export default function PickFood() {
  const router = useRouter();
  const choose = useCallback(
    (food: Food) => {
      deliverPick(food);
      router.back();
    },
    [router],
  );
  // produto lido pelo leitor de código de barras
  useFocusEffect(
    useCallback(() => {
      const f = takeScanned();
      if (f) choose(f);
    }, [choose]),
  );
  useEffect(() => () => cancelPick(), []); // saiu sem escolher
  return (
    <Screen title="Adicionar alimento" back>
      <FoodSearch onPick={choose} onScan={() => router.push('/alimentos/scanner')} />
    </Screen>
  );
}
