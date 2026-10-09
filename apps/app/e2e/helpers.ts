import { expect, type Locator, type Page } from '@playwright/test';

export const TOKEN = process.env.E2E_TOKEN || 'test-token-0123456789';
export const API = 'http://localhost:3001/api';

/** Chamada direta à API (para conferir o que o app mostra e o que chegou ao servidor). */
export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers as object) } });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

/** Abre o app já conectado ao servidor de teste. */
export async function openApp(page: Page, path = '/') {
  await page.addInitScript(
    ([url, token]) => {
      if (!localStorage.getItem('personutri:baseUrl')) {
        localStorage.setItem('personutri:baseUrl', url);
        localStorage.setItem('personutri:token', token);
      }
    },
    [API, TOKEN],
  );
  await page.goto(path);
}

export async function goTab(page: Page, name: 'Hoje' | 'Agenda' | 'Exercícios' | 'Corpo' | 'Mais') {
  await page.getByRole('tab', { name }).click();
  await expect(page.getByRole('heading', { name: name === 'Mais' ? 'Mais' : name })).toBeVisible();
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** As abas ficam montadas: restringe a busca ao que está visível na tela. */
export const vis = (l: Locator) => l.filter({ visible: true });
