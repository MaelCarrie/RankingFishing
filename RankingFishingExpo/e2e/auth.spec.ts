import { expect, test } from '@playwright/test';
import { DEMO_EMAIL, DEMO_PASSWORD, gotoLogin, loginAsDemo, tab } from './helpers';

test.describe('Authentification (mode mock)', () => {
  test("l'écran de connexion affiche l'indice du compte démo", async ({ page }) => {
    await gotoLogin(page);
    const hint = page.getByRole('button', { name: 'Remplir le compte démo' });
    await expect(hint).toContainText(DEMO_EMAIL);
    await hint.click();
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(DEMO_EMAIL);
    await expect(page.getByRole('textbox', { name: 'Mot de passe' })).toHaveValue(DEMO_PASSWORD);
  });

  test('login démo → feed visible', async ({ page }) => {
    await loginAsDemo(page);
    // Au moins une capture de la communauté est affichée
    await expect(page.getByRole('link', { name: /^Voir le profil de / }).first()).toBeVisible();
    await expect(tab(page, 'Accueil')).toHaveAttribute('aria-selected', 'true');
  });

  test('mauvais mot de passe → message d’erreur', async ({ page }) => {
    await gotoLogin(page);
    await page.getByRole('textbox', { name: 'Email' }).fill(DEMO_EMAIL);
    await page.getByRole('textbox', { name: 'Mot de passe' }).fill('mauvais-mdp');
    await page.getByText('Se connecter', { exact: true }).click();
    await expect(page.getByText('Email ou mot de passe incorrect')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Accueil' })).toHaveCount(0);
  });

  test('la session survit à un rechargement de la page', async ({ page }) => {
    await loginAsDemo(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Accueil' })).toBeVisible({ timeout: 60_000 });
  });

  test('inscription avec un nouvel email → accès à l’app', async ({ page }) => {
    await gotoLogin(page);
    await page.getByText("S'inscrire", { exact: true }).click();
    // L'écran de connexion reste monté (caché) sous l'inscription : on filtre sur le visible
    await page.getByPlaceholder('MonPseudo').fill('TruiteE2E');
    await page.getByPlaceholder('ton@email.fr').filter({ visible: true }).fill(`e2e-${Date.now()}@exemple.fr`);
    const passwords = page.getByPlaceholder('••••••••').filter({ visible: true });
    await passwords.nth(0).fill('Brochet2026!');
    await passwords.nth(1).fill('Brochet2026!');
    const cgu = page.getByRole('checkbox', { name: /J'accepte les/ });
    await expect(cgu).toHaveAttribute('aria-checked', 'false');
    await cgu.click();
    await expect(cgu).toHaveAttribute('aria-checked', 'true');
    await page.getByText('Créer mon compte', { exact: true }).click();
    await expect(tab(page, 'Accueil')).toBeVisible();
    await tab(page, 'Profil').click();
    await expect(page.getByText('TruiteE2E', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  });

  test('logout → retour à l’écran de connexion', async ({ page }) => {
    await loginAsDemo(page);
    await tab(page, 'Profil').click();
    await expect(page.getByRole('heading', { name: 'Mon profil' })).toBeVisible();
    // La confirmation passe par window.confirm sur le web (src/utils/dialog.ts)
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByText('Se déconnecter', { exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    // Plus de session après rechargement
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible({ timeout: 60_000 });
  });
});
