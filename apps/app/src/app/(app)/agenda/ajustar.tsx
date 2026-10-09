import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { type EditableItem, fromItemView, itemsAreValid, ops, today } from '@personutri/shared';
import { ItemsEditor } from '@/features/ItemsEditor';
import { toPreview } from '@/features/preview';
import { useDiaryView } from '@/lib/queries';
import { useOutbox } from '@/lib/outbox';
import { Screen } from '@/ui/layout';
import { Button, Card, Loading } from '@/ui/primitives';

export default function AdjustEntry() {
  const { entryId, date = today() } = useLocalSearchParams<{ entryId: string; date?: string }>();
  const router = useRouter();
  const { submit } = useOutbox();
  const { entries } = useDiaryView(date);
  const entry = entries?.find((e) => e.id === Number(entryId));
  const [items, setItems] = useState<EditableItem[] | null>(null);

  useEffect(() => {
    if (entry && items === null) setItems(entry.items.map(fromItemView));
  }, [entry, items]);

  return (
    <Screen
      title="Ajustar quantidades"
      subtitle={entry?.label}
      back
      footer={
        <Button
          title="Salvar"
          variant="primary"
          disabled={!entry || !items || !itemsAreValid(items)}
          onPress={() => {
            if (!entry || !items) return;
            submit(ops.diaryItems(entry.id, date, toPreview(items), entry.label));
            router.back();
          }}
        />
      }
    >
      {items ? (
        <Card>
          <ItemsEditor items={items} onChange={setItems} />
        </Card>
      ) : (
        <Loading />
      )}
    </Screen>
  );
}
