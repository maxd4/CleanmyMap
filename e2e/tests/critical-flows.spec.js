const { test, expect } = require("@playwright/test");

async function assertNoAppCrash(page) {
  await expect(page.locator("text=Traceback")).toHaveCount(0);
  await expect(page.locator("text=Exception")).toHaveCount(0);
}

async function expectActiveSection(page, sectionRegex) {
  await expect(page.locator("body")).toContainText(/Rubrique active|Active section/i, { timeout: 45_000 });
  await expect(page.locator("body")).toContainText(sectionRegex, { timeout: 45_000 });
}

test("Flux declaration: rubrique declaration chargee sans erreur", async ({ page }) => {
  await page.goto("/?tab=declaration");
  await expectActiveSection(page, /Déclarer une Action|Declare an Action/i);
  await assertNoAppCrash(page);
});

test("Flux carte: affichage et lien de partage disponibles", async ({ page }) => {
  await page.goto("/?tab=map");
  await expectActiveSection(page, /Carte Interactive|Interactive Map/i);
  await expect(page.locator("body")).toContainText(
    /Carte interactive des actions|Interactive action map/i,
    { timeout: 45_000 },
  );
  await assertNoAppCrash(page);
});

test("Flux rapport: section rapport chargee sans erreur", async ({ page }) => {
  await page.goto("/?tab=pdf");
  await expectActiveSection(page, /Rapport Impact|Impact Report/i);
  await assertNoAppCrash(page);
});
