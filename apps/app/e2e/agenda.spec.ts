import { expect, test } from '@playwright/test';
import { api, goTab, openApp, todayIso } from './helpers';

const today = todayIso();
const entries = async () => (await api(`/diary/${today}`)).entries as Array<{ id: number; label: string; status: string; kind: string; items: Array<{ foodName: string; grams: number }> }>;
const byLabel = async (label: string) => (await entries()).find((e) => e.label === label)!;

test.describe.serial('Agenda', () => {
  test('marcar refeição como feita chega ao servidor e atualiza o dia', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Agenda');
    const box = page.getByRole('checkbox', { name: 'Marcar Jantar como feita' });
    await expect(box).not.toBeChecked();
    await box.click();
    await expect(box).toBeChecked();
    await expect.poll(async () => (await byLabel('Jantar')).status).toBe('done');
    // o resumo do dia reflete o consumo
    const d = await api(`/dashboard?date=${today}`);
    await expect(page.getByText(`${Math.round(d.consumed.kcal).toLocaleString('pt-BR')}`).first()).toBeVisible();
    await box.click();
    await expect(box).not.toBeChecked();
    await expect.poll(async () => (await byLabel('Jantar')).status).toBe('pending');
  });

  test('pular e desfazer', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Agenda');
    const card = page.getByTestId('entry-Lanche da tarde');
    await card.getByRole('button', { name: 'Pular' }).click();
    await expect.poll(async () => (await byLabel('Lanche da tarde')).status).toBe('skipped');
    await expect(page.getByRole('button', { name: 'Desfazer' })).toBeVisible();
    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect.poll(async () => (await byLabel('Lanche da tarde')).status).toBe('pending');
  });

  test('consumo livre: buscar alimento, registrar e remover', async ({ page }) => {
    await openApp(page);
    await goTab(page, 'Agenda');
    await page.getByRole('button', { name: '+ Consumo livre' }).click();
    await page.getByLabel('Descrição (opcional)').fill('Lanche teste');
    await page.getByRole('button', { name: '+ Adicionar alimento' }).click();
    await page.getByLabel('Buscar alimento').fill('mamão papaia');
    await page.getByRole('button', { name: /Mamão, Papaia, cru/ }).first().click();
    await expect(page.getByLabel(/Gramas de Mamão/)).toHaveValue('100');
    await page.getByLabel(/Gramas de Mamão/).fill('150');
    await page.getByRole('button', { name: 'Registrar' }).click();

    await expect(page.getByText('Lanche teste').first()).toBeVisible();
    await expect.poll(async () => (await entries()).filter((e) => e.label === 'Lanche teste').length).toBe(1);
    const free = await byLabel('Lanche teste');
    expect(free).toMatchObject({ kind: 'free', status: 'done' });
    expect(free.items[0].grams).toBe(150);

    await page.getByTestId('entry-Lanche teste').getByRole('button', { name: 'Remover' }).click();
    await expect.poll(async () => (await entries()).filter((e) => e.label === 'Lanche teste').length).toBe(0);
  });

  test('ajustar quantidades de uma refeição programada', async ({ page }) => {
    await openApp(page);
    const almoco = await byLabel('Almoço');
    const first = almoco.items[0];
    await goTab(page, 'Agenda');
    const card = page.getByTestId('entry-Almoço');
    await card.getByRole('button', { name: 'Ajustar quantidades' }).click();
    await expect(page.getByRole('heading', { name: 'Ajustar quantidades' })).toBeVisible();
    await page.getByLabel(`Gramas de ${first.foodName}`).fill('333');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect.poll(async () => (await byLabel('Almoço')).items.find((i) => i.foodName === first.foodName)?.grams).toBe(333);
    // restaura
    await api(`/diary/entries/${almoco.id}`, { method: 'PATCH', body: JSON.stringify({ items: almoco.items.map((i: any) => ({ foodId: i.foodId, grams: i.grams })) }) });
  });
});
