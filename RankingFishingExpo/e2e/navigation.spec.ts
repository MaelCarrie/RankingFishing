import { expect, test } from '@playwright/test';
import { DEMO_USERNAME, iconButton, loginAsDemo, tab } from './helpers';

test.describe('Navigation', () => {
  test('les 5 onglets sont accessibles', async ({ page }) => {
    await loginAsDemo(page);

    await tab(page, 'Classement').click();
    await expect(page.getByRole('heading', { name: 'Classements' })).toBeVisible();
    await expect(tab(page, 'Classement')).toHaveAttribute('aria-selected', 'true');

    // Onglet central « + » (libellé accessible « Publier une prise »)
    await iconButton(page, 'add').click();
    await expect(page.getByRole('heading', { name: 'Nouvelle capture' })).toBeVisible();

    await tab(page, 'Messages').click();
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
    await expect(tab(page, 'Messages')).toHaveAttribute('aria-selected', 'true');

    await tab(page, 'Profil').click();
    await expect(page.getByRole('heading', { name: 'Mon profil' })).toBeVisible();
    await expect(page.getByText(DEMO_USERNAME, { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await tab(page, 'Accueil').click();
    await expect(page.getByRole('heading', { name: 'Accueil' })).toBeVisible();
  });
});
