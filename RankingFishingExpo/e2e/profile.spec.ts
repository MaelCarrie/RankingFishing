import { expect, test } from '@playwright/test';
import { loginAsDemo, tab } from './helpers';

test.describe('Modifier le profil', () => {
  async function openEditProfile(page: import('@playwright/test').Page) {
    await loginAsDemo(page);
    await tab(page, 'Profil').click();
    await page.getByRole('button', { name: 'Paramètres' }).filter({ visible: true }).first().click();
    await page.getByTestId('settings-edit-profile').click();
    await expect(page.getByRole('textbox', { name: 'Bio' })).toBeVisible();
  }

  test('retour sans enregistrer → choix proposé, « ne pas enregistrer » quitte sans erreur', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openEditProfile(page);

    await page.getByRole('textbox', { name: 'Bio' }).fill('Bio modifiée sans enregistrer');
    // Web : window.confirm. Annuler = ne pas enregistrer.
    page.once('dialog', (d) => {
      expect(d.message()).toContain('Enregistrer les modifications');
      d.dismiss();
    });
    await page.getByRole('button', { name: 'Retour' }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('settings-edit-profile')).toBeVisible();
    expect(errors).toEqual([]);

    // Les modifications n'ont pas été enregistrées
    await page.getByTestId('settings-edit-profile').click();
    await expect(page.getByRole('textbox', { name: 'Bio' })).not.toHaveValue('Bio modifiée sans enregistrer');
  });

  test('retour sans enregistrer → « enregistrer » sauvegarde puis quitte', async ({ page }) => {
    await openEditProfile(page);
    await page.getByRole('textbox', { name: 'Bio' }).fill('Bio enregistrée en sortant');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Retour' }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('settings-edit-profile')).toBeVisible();

    await page.getByTestId('settings-edit-profile').click();
    await expect(page.getByRole('textbox', { name: 'Bio' })).toHaveValue('Bio enregistrée en sortant');
  });
});
