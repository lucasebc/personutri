import { defineConfig } from '@playwright/test';

/**
 * Testes de ponta a ponta no navegador contra o app exportado para web (mesmo código do Android) e a API real.
 * Antes: `npm run build` no backend e `npm run build:web` no app. O servidor de teste (e2e/serve.cjs) sobe a API
 * com token e banco temporário, carrega os dados de demonstração e serve o app em :8081.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8081',
    viewport: { width: 390, height: 844 },
    locale: 'pt-BR',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node e2e/serve.cjs',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
