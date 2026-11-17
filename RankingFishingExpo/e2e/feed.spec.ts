import { expect, test } from '@playwright/test';
import { loginAsDemo } from './helpers';

test.describe('Feed', () => {
  test("like d'une capture puis retrait du like", async ({ page }) => {
    await loginAsDemo(page);

    // Première capture non likée du feed (LikeButton : « J’aime, N j’aime »)
    const like = page.getByRole('button', { name: /^J’aime, \d+ j’aime$/ }).first();
    await expect(like).toBeVisible();
    const card = page.locator('[aria-label*=" kg par "]').filter({ has: like }).first();
    const cardLabel = await card.getAttribute('aria-label');
    const before = Number((await like.innerText()).replace(/\D/g, ''));

    await like.click();

    const scoped = page.locator(`[aria-label="${cardLabel}"]`);
    const unlike = scoped.getByRole('button', { name: `Retirer le j’aime, ${before + 1} j’aime`, exact: true });
    await expect(unlike).toBeVisible();
    await expect(unlike).toHaveText(new RegExp(`(^|\\D)${before + 1}$`));

    await unlike.click();
    const likeAgain = scoped.getByRole('button', { name: `J’aime, ${before} j’aime`, exact: true });
    await expect(likeAgain).toBeVisible();
    await expect(likeAgain).toHaveText(new RegExp(`(^|\\D)${before}$`));
  });
});
