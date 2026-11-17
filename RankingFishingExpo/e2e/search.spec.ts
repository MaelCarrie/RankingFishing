import { expect, test } from '@playwright/test';
import { iconButton, loginAsDemo } from './helpers';

test.describe("Recherche d'utilisateurs", () => {
  test('recherche → profil public', async ({ page }) => {
    await loginAsDemo(page);

    await iconButton(page, 'search').click();
    await expect(page.getByRole('heading', { name: 'Rechercher' })).toBeVisible();

    await page.getByPlaceholder('Rechercher un pêcheur...').fill('brochet');
    // Le feed (caché) contient aussi « BrochetQueen » : on ne garde que les résultats visibles
    const result = page.getByText('BrochetQueen', { exact: true }).filter({ visible: true });
    await expect(result).toBeVisible();
    await expect(page.getByText('BrochetFou', { exact: true }).filter({ visible: true })).toBeVisible();
    await result.click();

    await expect(page.getByRole('heading', { name: 'BrochetQueen' })).toBeVisible();
    await expect(page.getByText('Rouen, Seine-Maritime').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Envoyer un message à BrochetQueen' })).toBeVisible();
  });

  test('recherche sans résultat', async ({ page }) => {
    await loginAsDemo(page);
    await iconButton(page, 'search').click();
    await page.getByPlaceholder('Rechercher un pêcheur...').fill('zzzzzz');
    await expect(page.getByText('Aucun pêcheur trouvé').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('BrochetQueen', { exact: true }).filter({ visible: true })).toHaveCount(0);
  });
});
