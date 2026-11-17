import { expect, Locator, Page } from '@playwright/test';

export const DEMO_EMAIL = 'demo@rankingfishing.app';
export const DEMO_PASSWORD = 'demo1234';
export const DEMO_USERNAME = 'PierreM';

// Boutons icônes de l'en-tête et onglet central (MainNavigator.tsx), par libellé accessible
const ICON_BUTTON_LABEL = {
  search: 'Rechercher un pêcheur',
  bell: "Demandes d'abonnement",
  add: 'Publier une prise',
};

export function iconButton(page: Page, name: keyof typeof ICON_BUTTON_LABEL): Locator {
  return page.getByRole('button', { name: ICON_BUTTON_LABEL[name] }).filter({ visible: true }).first();
}

export function tab(page: Page, name: 'Accueil' | 'Classement' | 'Messages' | 'Profil'): Locator {
  // Ancré en fin de nom : l'écran Classements a aussi des onglets « Classement global »…
  return page.getByRole('tab', { name: new RegExp(`${name}$`) });
}

/** Ouvre l'app sur l'écran de connexion (contexte vierge : aucune session). */
export async function gotoLogin(page: Page): Promise<void> {
  // Présentation du premier lancement (OnboardingScreen) déjà vue : on va droit à la connexion
  await page.addInitScript(() => {
    window.localStorage.setItem('@rankingfishing_onboarding_done', '1');
  });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible({ timeout: 60_000 });
}

/** Connexion avec le compte démo du mode mock, jusqu'au feed. */
export async function loginAsDemo(page: Page): Promise<void> {
  await gotoLogin(page);
  await page.getByRole('textbox', { name: 'Email' }).fill(DEMO_EMAIL);
  await page.getByRole('textbox', { name: 'Mot de passe' }).fill(DEMO_PASSWORD);
  await page.getByText('Se connecter', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Accueil' })).toBeVisible();
}
