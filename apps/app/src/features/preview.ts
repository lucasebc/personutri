import type { EditableItem, PreviewItem } from '@personutri/shared';

/** Item editável → item de pré-visualização guardado na fila offline. */
export const toPreview = (items: EditableItem[]): PreviewItem[] =>
  items.map((i) => ({ foodId: i.foodId, name: i.name, brand: i.brand, grams: i.grams, per100: i.per100 }));
