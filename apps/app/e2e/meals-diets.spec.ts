import { expect, test } from '@playwright/test';
import { api, goTab, openApp, todayIso } from './helpers';

const meals = async () => (await api('/meals')) as Array<{ id: number; name: string; items: Array<{ grams: number }> }>;

test.describe.serial('Refeições e dietas', () => {
  test('criar, editar e listar refeição', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Mais');
    await page.getByRole('button', { name: 'Refeições' }).click();
    await page.getByRole('button', { name: '+ Nova' }).click();
    await page.getByLabel('Nome', { exact: true }).fill('Teste e2e');
    await page.getByRole('button', { name: '+ Adicionar alimento' }).click();
    await page.getByLabel('Buscar alimento').fill('banana prata crua');
    await page.getByRole('button', { name: /Banana, prata, crua/ }).first().click();
    await page.getByLabel(/Gramas de Banana/).fill('120');
    await page.getByRole('button', { name: 'Salvar' }).click();

    const card = page.getByTestId('meal-Teste e2e');
    await expect(card).toBeVisible();
    await expect(card.getByText(/Banana, prata, crua/)).toBeVisible();
    expect((await meals()).find((m) => m.name === 'Teste e2e')!.items[0].grams).toBe(120);

    await card.getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel(/Gramas de Banana/).fill('250');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect.poll(async () => (await meals()).find((m) => m.name === 'Teste e2e')!.items[0].grams).toBe(250);
  });

  test('criar dieta com a refeição, ativar e ver na agenda; depois limpar', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Mais');
    await page.getByRole('button', { name: 'Dietas' }).click();
    await page.getByRole('button', { name: '+ Nova' }).click();
    await page.getByLabel('Nome da dieta').fill('Dieta e2e');
    await page.getByRole('button', { name: '+ Adicionar refeição à dieta' }).click();
    await page.getByLabel('Nome no dia').fill('Ceia e2e');
    await page.getByLabel('Horário').fill('22:15');
    await page.getByRole('button', { name: 'Refeição', exact: true }).click();
    await page.getByRole('button', { name: /Teste e2e/ }).click();
    await page.getByRole('button', { name: 'Salvar' }).click();

    const card = page.getByTestId('diet-Dieta e2e');
    await expect(card).toBeVisible();
    await expect(card.getByText('Ceia e2e')).toBeVisible();
    await card.getByRole('button', { name: 'Ativar' }).click();
    await expect(card.getByText('ATIVA')).toBeVisible();

    const day = (await api(`/diary/${todayIso()}`)).entries as Array<{ label: string }>;
    expect(day.map((e) => e.label)).toContain('Ceia e2e');
    // pendências da dieta anterior saem; o que já foi marcado como feito (Almoço) fica
    expect(day.map((e) => e.label)).not.toContain('Jantar');
    expect(day.map((e) => e.label)).toContain('Almoço');

    // limpeza: reativa a dieta original e apaga as de teste
    const diets = (await api('/diets')) as Array<{ id: number; name: string }>;
    await api(`/diets/${diets.find((d) => d.name.startsWith('Cutting'))!.id}/activate`, { method: 'POST' });
    await api(`/diets/${diets.find((d) => d.name === 'Dieta e2e')!.id}`, { method: 'DELETE' });
    await api(`/meals/${(await meals()).find((m) => m.name === 'Teste e2e')!.id}`, { method: 'DELETE' });
  });
});
