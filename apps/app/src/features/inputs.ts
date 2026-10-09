import type { EditableItem } from '@personutri/shared';

/** Itens → corpo da requisição ({ foodId, gramas }). */
export const toInputsOf = (items: EditableItem[]) => items.map((i) => ({ foodId: i.foodId, grams: i.grams }));
