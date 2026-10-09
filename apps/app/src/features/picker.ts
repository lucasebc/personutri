import type { useRouter } from 'expo-router';
import type { Food } from '@personutri/shared';

type Router = ReturnType<typeof useRouter>;

/**
 * Ponte entre quem pede um alimento e a tela de busca (rota própria, para o botão voltar do Android funcionar).
 * `pickFood` guarda o que fazer com a escolha; a tela de busca chama `deliverPick`.
 */
let handler: ((food: Food) => void) | null = null;
let scanned: Food | null = null;

export function pickFood(router: Router, onPick: (food: Food) => void) {
  handler = onPick;
  router.push('/alimentos/escolher');
}

export function hasPickHandler() {
  return handler !== null;
}

export function deliverPick(food: Food) {
  const h = handler;
  handler = null;
  h?.(food);
}

export function cancelPick() {
  handler = null;
}

/** O leitor de código de barras deixa o produto aqui; a tela que o abriu o recolhe ao voltar ao foco. */
export function setScanned(food: Food) {
  scanned = food;
}
export function takeScanned(): Food | null {
  const f = scanned;
  scanned = null;
  return f;
}
