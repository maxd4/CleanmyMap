import { expect, test, type Page } from "@playwright/test";

async function openMessagerie(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto("/sections/messagerie?tab=discussions");
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  await rejectCookies
    .waitFor({ state: "visible", timeout: 2_000 })
    .then(() => rejectCookies.click({ force: true }))
    .catch(() => undefined);
}

test.describe("Messagerie — architecture d'information", () => {
  test("desktop expose les contextes dans l'ordre et masque Admin non autorisé", async ({ page }) => {
    await openMessagerie(page, { width: 1280, height: 900 });

    await expect(page.getByRole("heading", { name: "Messagerie", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Communauté globale", exact: true })).toBeVisible();
    const sidebar = page.locator('[data-connect-panel="discussions"] aside').first();
    await expect(sidebar.getByRole("button", { name: /Coordination de secteur|Territoire global/ }).last()).toBeVisible();
    await expect(sidebar.getByText("Actions", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Admin & élus", exact: true })).toHaveCount(0);

    await expect(sidebar).toBeVisible();
    expect(await sidebar.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: "artifacts/playwright/messagerie-ui/desktop.png", fullPage: true });
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
    await page.screenshot({ path: "artifacts/playwright/messagerie-ui/mobile-discussions.png", fullPage: true });
  });

  test("mobile conserve le parcours inbox puis fil des messages privés", async ({ page }) => {
    await openMessagerie(page, { width: 390, height: 844 });

    const privateTab = page.getByRole("tab", { name: /Messages privés/ });
    await expect
      .poll(
        async () => {
          if ((await privateTab.getAttribute("aria-selected")) !== "true") {
            await privateTab.click();
          }
          return privateTab.getAttribute("aria-selected");
        },
        { timeout: 5_000 },
      )
      .toBe("true");
    await expect(page.getByRole("heading", { name: "Conversations", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Démarrer une conversation|Nouveau/ }).click();
    await expect(page.getByRole("textbox", { name: "Rechercher un membre", exact: true })).toBeVisible();
    await page.screenshot({ path: "artifacts/playwright/messagerie-ui/mobile-dm.png", fullPage: true });
  });
});
