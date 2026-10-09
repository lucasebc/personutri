import { expect, test } from '@playwright/test';
import { api, goTab, openApp, todayIso, vis } from './helpers';

const today = todayIso();
const workouts = async () => (await api(`/workouts?date=${today}`)).workouts as Array<{ id: number; durationMin: number; netKcal: number | null; activity: { name: string } }>;

test.describe.serial('Exercícios', () => {
  test('registrar corrida por distância com estimativa ao vivo, editar e remover', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Exercícios');
    await page.getByRole('button', { name: '+ Treino' }).click();
    await page.getByRole('button', { name: 'Atividade' }).click();
    await page.getByRole('button', { name: 'Corrida', exact: true }).click();
    await page.getByLabel('Duração (min)').fill('30');
    await page.getByLabel('Distância (km)').fill('5');
    await expect(page.getByText(/≈ \d+ kcal ativas/)).toBeVisible();
    await expect(page.getByText(/10,5 MET/)).toBeVisible(); // 10 km/h
    await page.getByRole('button', { name: 'Salvar' }).click();

    const card = page.getByTestId('workout-Corrida');
    await expect(card).toBeVisible();
    await expect.poll(async () => (await workouts()).find((w) => w.activity.name === 'Corrida')?.netKcal ?? 0).toBeGreaterThan(300);

    await card.getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Duração (min)').fill('45');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect.poll(async () => (await workouts()).find((w) => w.activity.name === 'Corrida')?.durationMin).toBe(45);

    await page.getByTestId('workout-Corrida').getByRole('button', { name: 'Remover Corrida' }).click();
    await expect.poll(async () => (await workouts()).some((w) => w.activity.name === 'Corrida')).toBe(false);
  });

  test('calorias do relógio substituem o cálculo', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Exercícios');
    await page.getByRole('button', { name: '+ Treino' }).click();
    await page.getByRole('button', { name: 'Atividade' }).click();
    await page.getByRole('button', { name: 'Yoga (hatha)' }).click();
    await page.getByLabel('Duração (min)').fill('60');
    await page.getByLabel('Calorias ativas do relógio (kcal, opcional)').fill('123');
    await expect(page.getByText('123 kcal ativas')).toBeVisible();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect.poll(async () => (await workouts()).find((w) => w.activity.name === 'Yoga (hatha)')?.netKcal).toBe(123);
    await page.getByTestId('workout-Yoga (hatha)').getByRole('button', { name: /Remover/ }).click();
    await expect.poll(async () => (await workouts()).some((w) => w.activity.name === 'Yoga (hatha)')).toBe(false);
  });

  test('atividade por velocidade exige distância ou velocidade', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Exercícios');
    await page.getByRole('button', { name: '+ Treino' }).click();
    await page.getByRole('button', { name: 'Atividade' }).click();
    await page.getByRole('button', { name: 'Caminhada', exact: true }).click();
    await page.getByLabel('Duração (min)').fill('30');
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    await page.getByLabel('ou velocidade (km/h)').fill('5');
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });

  test('catálogo: criar e remover atividade própria', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Exercícios');
    await page.getByRole('button', { name: 'Catálogo de atividades' }).click();
    const cat = page.getByTestId('screen-Catálogo');
    await expect(cat.getByText('Musculação (intensa)')).toBeVisible();
    await page.getByRole('button', { name: '+ Nova' }).click();
    await page.getByLabel('Nome', { exact: true }).fill('Futevôlei e2e');
    await page.getByLabel('Categoria').fill('Esportes');
    await page.getByLabel('MET (intensidade)').fill('8');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(cat.getByText('Futevôlei e2e')).toBeVisible();
    await expect(cat.getByText('minha', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Remover Futevôlei e2e' }).click();
    await expect(cat.getByText('Futevôlei e2e')).toHaveCount(0);
    expect(((await api('/activities')) as Array<{ name: string }>).some((a) => a.name === 'Futevôlei e2e')).toBe(false);
  });
});
