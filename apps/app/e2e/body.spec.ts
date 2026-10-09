import { expect, test } from '@playwright/test';
import { api, goTab, openApp, todayIso, vis } from './helpers';

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

test.describe.serial('Corpo', () => {
  test('mostra metas, previsão (gráfico e tabela) e pesagens', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Corpo');
    for (const t of ['Peso atual', 'Metabolismo basal', 'Gasto diário (TDEE)', 'Meta calórica', 'Previsão semanal de peso', 'Registrar pesagem', 'Perfil corporal']) {
      await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByLabel('Previsão de peso')).toBeVisible();
    const f = await api('/forecast/weekly?weeks=12&ahead=4');
    expect(f.ready).toBe(true);
    await expect(page.getByText(/em andamento/)).toBeVisible();
    await expect(page.getByText('Erro médio')).toBeVisible();
  });

  test('registrar e remover pesagem', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Corpo');
    const yesterday = addDays(todayIso(), -40); // dia sem pesagem na demonstração
    const screen = page.getByTestId('screen-Corpo');
    for (let i = 0; i < 40; i++) await screen.getByLabel('Dia anterior').click();
    await page.getByLabel('Peso em kg').fill('84,3');
    await page.getByRole('button', { name: 'Registrar peso' }).click();
    await expect(screen.getByText('84,3 kg').first()).toBeVisible();
    await expect.poll(async () => ((await api('/body/weights')) as Array<{ date: string; weightKg: number }>).find((w) => w.date === yesterday)?.weightKg).toBe(84.3);
    await page.getByLabel(`Remover pesagem de ${yesterday}`).click();
    await expect.poll(async () => ((await api('/body/weights')) as Array<{ date: string }>).some((w) => w.date === yesterday)).toBe(false);
  });

  test('editar o perfil (objetivo) e salvar no servidor', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Corpo');
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.getByRole('button', { name: 'Objetivo' }).click();
    await page.getByRole('button', { name: 'Manter o peso' }).click();
    await page.getByRole('button', { name: 'Salvar perfil' }).click();
    await expect.poll(async () => (await api('/body')).profile.weeklyGoalKg).toBe(0);
    await expect(page.getByText('manutenção').first()).toBeVisible();
    // restaura
    await api('/body/profile', { method: 'PUT', body: JSON.stringify({ ...(await api('/body')).profile, weeklyGoalKg: -0.5 }) });
  });
});
