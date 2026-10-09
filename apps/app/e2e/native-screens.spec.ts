import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.describe('Telas nativas na web', () => {
  test('Sincronização avisa que o Health Connect é só do app Android', async ({ page }) => {
    await openApp(page, '/sincronizacao');
    await expect(page.getByText(/existe apenas no app Android/)).toBeVisible();
  });

  test('Configurações abre sem quebrar', async ({ page }) => {
    await openApp(page, '/configuracoes');
    await expect(page.getByText(/Lembretes/).first()).toBeVisible();
  });
});
