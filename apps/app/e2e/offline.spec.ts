import { expect, test } from '@playwright/test';
import { api, goTab, openApp, todayIso } from './helpers';

const today = todayIso();
const entries = async () => (await api(`/diary/${today}`)).entries as Array<{ id: number; label: string; status: string; kind: string; items: Array<{ grams: number }>; totals: { kcal: number } }>;
const byLabel = async (label: string) => (await entries()).find((e) => e.label === label);

test.describe.serial('Offline: registrar sem sinal e sincronizar depois', () => {
  test('marcar refeição offline aparece como "a enviar" e sincroniza ao voltar o sinal', async ({ page, context }) => {
    await openApp(page);
    await goTab(page, 'Agenda');
    const box = page.getByRole('checkbox', { name: 'Marcar Jantar como feita' });
    await expect(box).not.toBeChecked();

    await context.setOffline(true);
    await box.click();
    await expect(box).toBeChecked();
    await expect(page.getByText(/Sem conexão/).first()).toBeVisible();
    await expect(page.getByTestId('entry-Jantar').getByText('a enviar')).toBeVisible();
    // o servidor ainda não sabe
    expect((await byLabel('Jantar'))!.status).toBe('pending');

    // as pendências ficam listadas
    await goTab(page, 'Mais');
    await expect(page.getByText('1 a enviar')).toBeVisible();

    await context.setOffline(false);
    await expect.poll(async () => (await byLabel('Jantar'))!.status, { timeout: 20_000 }).toBe('done');
    await goTab(page, 'Agenda');
    await expect(page.getByTestId('entry-Jantar').getByText('a enviar')).toHaveCount(0);
    await expect(page.getByText(/\d+ registros? aguardando envio/)).toHaveCount(0);

    await api(`/diary/entries/${(await byLabel('Jantar'))!.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'pending' }) });
  });

  test('consumo livre criado offline (com alimento recente) soma ao dia e vai ao servidor ao reconectar', async ({ page, context }) => {
    await openApp(page);

    // 1) online: usar um alimento uma vez para ele entrar nos "recentes"
    await goTab(page, 'Agenda');
    await page.getByRole('button', { name: '+ Consumo livre' }).click();
    await page.getByRole('button', { name: '+ Adicionar alimento' }).click();
    await page.getByLabel('Buscar alimento').fill('banana prata crua');
    await page.getByRole('button', { name: /Banana, prata, crua/ }).first().click();
    await expect(page.getByLabel(/Gramas de Banana/)).toBeVisible();
    await page.getByLabel('Voltar').click(); // sai sem registrar

    // 2) guardar o consumo de hoje para comparar
    await goTab(page, 'Hoje');
    const before = (await api(`/dashboard?date=${today}`)).consumed.kcal as number;

    // 3) offline: registrar usando o recente
    await context.setOffline(true);
    await goTab(page, 'Agenda');
    await page.getByRole('button', { name: '+ Consumo livre' }).click();
    await page.getByLabel('Descrição (opcional)').fill('Banana offline');
    await page.getByRole('button', { name: '+ Adicionar alimento' }).click();
    await expect(page.getByText('Usados recentemente')).toBeVisible();
    await page.getByRole('button', { name: /Banana, prata, crua/ }).first().click();
    await page.getByLabel(/Gramas de Banana/).fill('200');
    await page.getByRole('button', { name: 'Registrar' }).click();

    await expect(page.getByTestId('entry-Banana offline')).toBeVisible();
    await expect(page.getByTestId('entry-Banana offline').getByText('a enviar')).toBeVisible();
    expect(await byLabel('Banana offline')).toBeUndefined();

    // o dashboard em cache já considera o consumo pendente
    await goTab(page, 'Hoje');
    const shownKcal = await page.getByLabel(/ de .* kcal$/).first().getAttribute('aria-label');
    const shown = Number((shownKcal ?? '').split(' de ')[0].replace(/\./g, ''));
    expect(shown).toBeGreaterThan(before);

    // 4) volta o sinal: o servidor recebe e a marca "a enviar" some
    await context.setOffline(false);
    await expect.poll(async () => (await byLabel('Banana offline'))?.items[0].grams, { timeout: 20_000 }).toBe(200);
    await goTab(page, 'Agenda');
    await expect(page.getByTestId('entry-Banana offline').getByText('a enviar')).toHaveCount(0);
    expect((await entries()).filter((e) => e.label === 'Banana offline')).toHaveLength(1); // sem duplicar

    await api(`/diary/entries/${(await byLabel('Banana offline'))!.id}`, { method: 'DELETE' });
  });

  test('editar e remover um consumo livre ainda pendente não envia nada ao servidor', async ({ page, context }) => {
    await openApp(page);
    await goTab(page, 'Agenda');
    await page.getByRole('button', { name: '+ Consumo livre' }).click();
    await page.getByRole('button', { name: '+ Adicionar alimento' }).click();
    await page.getByLabel('Buscar alimento').fill('banana prata crua');
    await page.getByRole('button', { name: /Banana, prata, crua/ }).first().click();
    await page.getByLabel('Voltar').click();

    await context.setOffline(true);
    await goTab(page, 'Agenda');
    await page.getByRole('button', { name: '+ Consumo livre' }).click();
    await page.getByLabel('Descrição (opcional)').fill('Efêmero');
    await page.getByRole('button', { name: '+ Adicionar alimento' }).click();
    await page.getByRole('button', { name: /Banana, prata, crua/ }).first().click();
    await page.getByRole('button', { name: 'Registrar' }).click();
    await expect(page.getByTestId('entry-Efêmero')).toBeVisible();

    await page.getByTestId('entry-Efêmero').getByRole('button', { name: 'Remover' }).click();
    await expect(page.getByTestId('entry-Efêmero')).toHaveCount(0);
    await context.setOffline(false);
    await page.waitForTimeout(1500);
    expect(await byLabel('Efêmero')).toBeUndefined();
  });

  test('treino e pesagem offline sincronizam ao reconectar', async ({ page, context }) => {
    await openApp(page);
    await goTab(page, 'Exercícios');
    await goTab(page, 'Corpo');
    const workoutsBefore = (await api(`/workouts?date=${today}`)).workouts.length as number;

    await context.setOffline(true);
    await goTab(page, 'Exercícios');
    await page.getByRole('button', { name: '+ Treino' }).click();
    await page.getByRole('button', { name: 'Atividade' }).click();
    await page.getByRole('button', { name: 'Musculação (intensa)' }).click();
    await page.getByLabel('Duração (min)').fill('40');
    await expect(page.getByText(/≈ \d+ kcal ativas/)).toBeVisible(); // estimativa local, sem internet
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Musculação (intensa)').first()).toBeVisible();
    await expect(page.getByText('a enviar').first()).toBeVisible();

    await goTab(page, 'Corpo');
    await page.getByLabel('Peso em kg').fill('79,4');
    await page.getByRole('button', { name: 'Registrar peso' }).click();
    await expect(page.getByText('79,4 kg')).toBeVisible();

    await context.setOffline(false);
    await expect.poll(async () => (await api(`/workouts?date=${today}`)).workouts.length, { timeout: 20_000 }).toBe(workoutsBefore + 1);
    await expect.poll(async () => ((await api('/body/weights')) as Array<{ date: string; weightKg: number }>).find((w) => w.date === today)?.weightKg, { timeout: 20_000 }).toBe(79.4);

    // limpeza
    const w = (await api(`/workouts?date=${today}`)).workouts.find((x: any) => x.activity.name === 'Musculação (intensa)');
    await api(`/workouts/${w.id}`, { method: 'DELETE' });
  });
});
