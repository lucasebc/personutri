import { expect, test } from '@playwright/test';
import { API, TOKEN } from './helpers';

test('login: token errado é recusado e o certo entra e persiste', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Conecte ao seu servidor')).toBeVisible();

  await page.getByLabel('Endereço do servidor').fill(API.replace('/api', ''));
  await page.getByLabel('Token de acesso').fill('token-errado-123456');
  await page.getByRole('button', { name: 'Conectar' }).click();
  await expect(page.getByText('Token recusado')).toBeVisible();

  await page.getByLabel('Token de acesso').fill(TOKEN);
  await page.getByRole('button', { name: 'Conectar' }).click();
  await expect(page.getByRole('heading', { name: 'Hoje' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hoje' })).toBeVisible();
});

test('login: servidor inexistente mostra erro de conexão', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Endereço do servidor').fill('http://localhost:9');
  await page.getByRole('button', { name: 'Conectar' }).click();
  await expect(page.getByText('Sem conexão com o servidor.')).toBeVisible();
});
