import { expect, test, type Page } from "@playwright/test";

async function openMessagerie(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto("/sections/messagerie?tab=discussions");
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await rejectCookies.isVisible().catch(() => false)) {
    await rejectCookies.click({ force: true });
  }
}

test.describe("Messagerie — architecture d'information", () => {
  test("desktop expose les contextes dans l'ordre et masque Admin non autorisé", async ({ page }) => {
    await openMessagerie(page, { width: 1280, height: 900 });

    await expect(page.getByRole("heading", { name: "Messagerie", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Communauté globale", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Coordination de secteur|Territoire global/ })).toBeVisible();
    await expect(page.getByText("Actions", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Admin & élus", exact: true })).toHaveCount(0);

    const sidebar = page.locator('[data-connect-panel="discussions"] aside').first();
    await expect(sidebar).toBeVisible();
    expect(await sidebar.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  });

  test("mobile suit le drill-down contextes puis fil avec retour clavier", async ({ page }) => {
    await openMessagerie(page, { width: 390, height: 844 });

    const community = page.getByRole("button", { name: "Communauté globale", exact: true });
    await expect(community).toBeVisible();
    await community.focus();
    await expect(community).toBeFocused();
    await page.keyboard.press("Enter");

    const back = page.getByRole("button", { name: "Retour aux contextes", exact: true });
    await expect(back).toBeVisible();
    await back.focus();
    await page.keyboard.press("Enter");
    await expect(back).toBeHidden();
    await expect(community).toBeVisible();
  });

  test("mobile conserve le parcours inbox puis fil des messages privés", async ({ page }) => {
    await openMessagerie(page, { width: 390, height: 844 });

    await page.getByRole("button", { name: /Messages privés/ }).click();
    await expect(page.getByRole("heading", { name: "Conversations", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Démarrer une conversation|Nouveau/ }).click();
    await expect(page.getByRole("button", { name: "Retour aux conversations", exact: true })).toBeVisible();
  });
});
