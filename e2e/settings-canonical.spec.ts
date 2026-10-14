import { expect, test, type Page } from "@playwright/test";

// AUTH_SURFACE: PROTECTED_CLERK_CLIENT
// BROWSER_HARNESS: Clerk Development storageState from global setup
// AUTH_MODE: authenticated synthetic Clerk Development user
// HOST_URL: local http://localhost:3000 only
// PERSISTENCE: read-only surface assertions; no settings mutation is submitted

test.setTimeout(120_000);

async function openSettings(page: Page): Promise<void> {
  const response = await page.goto("/reglages", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  const refuseCookies = page.getByRole("button", { name: "Tout refuser", exact: true });
  if (await refuseCookies.isVisible().catch(() => false)) await refuseCookies.click();
  await expect(page.getByRole("heading", { name: "Réglages", exact: true })).toBeVisible({ timeout: 30_000 });
}

test("la surface reglages expose cinq rubriques et des contrôles ciblés", async ({ page }) => {
  await openSettings(page);
  for (const heading of [
    "Informations personnelles",
    "Identité publique",
    "Localisation",
    "Préférences",
    "Sécurité et données",
  ]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("textbox", { name: "Handle public" })).toBeVisible();
  await expect(page.getByText("Un pseudonyme masque le nom affiché", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Consulter mon profil", exact: true })).toHaveAttribute("href", "/profil");
  await expect(page.locator('a[href="/onboarding/localisation"]')).toHaveCount(0);
});

test("la surface reglages reste lisible sur mobile sans mutation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSettings(page);
  await expect(page.getByRole("heading", { name: "Informations personnelles", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sécurité et données", exact: true })).toBeVisible();
});
