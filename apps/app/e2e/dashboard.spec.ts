import { expect, test } from '@playwright/test';
import { fmt } from '@personutri/shared';
import { api, goTab, openApp, todayIso } from './helpers';

test('Hoje: calorias, macros, exercício e refeições batem com a API', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('heading', { name: 'Hoje' })).toBeVisible();
  const d = await api(`/dashboard?date=${todayIso()}`);

  // anel de calorias
  await expect(page.getByLabel(`${fmt(d.consumed.kcal)} de ${fmt(d.targets.kcal)} kcal`)).toBeVisible();
  // balanço
  await expect(page.getByText(/Déficit de|Superávit de|Manutenção/).first()).toBeVisible();
  await expect(page.getByText(`${fmt(d.energy.tdee)} kcal`, { exact: true })).toBeVisible();
  // seções
  for (const t of ['Calorias', 'Distribuição das calorias', 'Macronutrientes', 'Exercício do dia', 'Últimos 7 dias', 'Micronutrientes e limites']) {
    await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText(`Refeições (${d.mealsDone}/${d.mealsTotal})`)).toBeVisible();
  // micronutriente sem dado na TACO aparece como "sem dados", não como zero
  await expect(page.getByText('sem dados nos alimentos').first()).toBeVisible();
  await expect(page.getByLabel('Consumo dos últimos 7 dias')).toBeVisible();
});

test('Hoje: navegar de dia mostra outro dia e volta para hoje', async ({ page }) => {
  await openApp(page);
  await page.getByLabel('Dia anterior').click();
  await expect(page.getByText(/^\d{2}\/\d{2}\/\d{4}$/).first()).not.toHaveText(/^$/);
  await expect(page.getByLabel('Ir para hoje')).toBeVisible();
  await page.getByLabel('Ir para hoje').click();
  await expect(page.getByLabel('Ir para hoje')).toHaveCount(0);
});

test('abas: todas abrem', async ({ page }) => {
  await openApp(page);
  for (const t of ['Agenda', 'Exercícios', 'Corpo', 'Mais', 'Hoje'] as const) await goTab(page, t);
});
