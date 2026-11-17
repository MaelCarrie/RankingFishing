/**
 * Tests E2E (Expo web, mode mock) : `npm run e2e`.
 *
 * Le webServer lance `npm run web:mock` (EXPO_PUBLIC_USE_MOCK=1, port 8082) :
 * aucune requête vers Supabase, données simulées dans src/api/mock/.
 * Si un serveur mock tourne déjà sur 8082, il est réutilisé.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 8082;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Metro compile le bundle à la première requête : on limite la concurrence
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Binaire Chromium complet (nouveau mode headless) : pas besoin de chromium-headless-shell
        channel: 'chromium',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run web:mock',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 240_000,
    // Pas de CI=1 : en mode CI, Metro ne surveille plus les fichiers et un serveur
    // réutilisé servirait un bundle périmé.
    env: { EXPO_PUBLIC_USE_MOCK: '1' },
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
