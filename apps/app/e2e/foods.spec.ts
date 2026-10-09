import { expect, test } from '@playwright/test';
import { api, goTab, openApp, vis } from './helpers';

async function openFoods(page: import('@playwright/test').Page) {
  await openApp(page);
  await goTab(page, 'Mais');
  await page.getByRole('button', { name: 'Alimentos' }).click();
  await expect(page.getByRole('heading', { name: 'Alimentos' })).toBeVisible();
}

test('busca na TACO (sem acento, qualquer ordem) e detalhe com micronutrientes', async ({ page }) => {
  await openFoods(page);
  await page.getByLabel('Buscar alimento').fill('preto feijao');
  await page.getByRole('button', { name: /Feijão, preto, cozido/ }).first().click();
  await expect(page.getByRole('heading', { name: /Feijão, preto, cozido/ })).toBeVisible();
  await expect(page.getByText('Valores por 100 g')).toBeVisible();
  const detail = page.getByTestId(/^screen-Feijão/);
  await expect(detail.getByText('Calorias', { exact: true })).toBeVisible();
  await expect(detail.getByText('Ferro', { exact: true })).toBeVisible();
});

test('Open Food Facts: produtos e código de barras respondem ou avisam sem quebrar', async ({ page }) => {
  await openFoods(page);
  await page.getByRole('tab', { name: 'Produtos (Open Food Facts)' }).click();
  await page.getByLabel('Buscar alimento').fill('leite condensado');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  // com internet vêm produtos; sem acesso ao Open Food Facts a API avisa e o app mostra o aviso
  await expect(vis(page.getByText(/leite condensado/i).or(page.getByText(/Open Food Facts/i))).first()).toBeVisible({ timeout: 25_000 });

  await page.getByLabel('Ler código de barras').click();
  await expect(page.getByRole('heading', { name: 'Ler código de barras' })).toBeVisible();
  await page.getByLabel('Código de barras', { exact: true }).fill('7891000100103');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(vis(page.getByText(/Open Food Facts|não encontrado|Sem conexão/i).or(page.getByText('Valores por 100 g'))).first()).toBeVisible({ timeout: 25_000 });
});

test('cadastrar alimento próprio, ver e remover', async ({ page }) => {
  await openFoods(page);
  await page.getByRole('button', { name: '+ Novo' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Pão e2e');
  await page.getByLabel('Calorias (kcal)').fill('250,5');
  await page.getByLabel('Proteínas (g)').fill('8');
  await page.getByLabel('Carboidratos (g)').fill('50');
  await page.getByLabel('Gorduras (g)').fill('2');
  await page.getByRole('button', { name: 'Micronutrientes (opcional)' }).click();
  await page.getByLabel('Sódio (mg)').fill('480');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByRole('heading', { name: 'Pão e2e' })).toBeVisible();
  await expect(vis(page.getByText('251 kcal'))).toBeVisible();
  await expect(vis(page.getByText('480 mg'))).toBeVisible();
  const found = (await api('/foods/search?source=local&q=pao e2e')).foods;
  expect(found).toHaveLength(1);
  expect(found[0]).toMatchObject({ source: 'custom', kcal: 250.5, micros: { sodium: 480 } });

  await page.getByRole('button', { name: 'Remover alimento' }).click();
  await expect.poll(async () => (await api('/foods/search?source=local&q=pao e2e')).foods.length).toBe(0);
});
