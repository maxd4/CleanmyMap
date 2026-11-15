import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

async function openOnboarding(page: Page, options: { expectTitle?: boolean } = {}): Promise<void> {
  const response = await page.goto("/onboarding?next=%2Fprofil", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(200);
  const refuseCookies = page.getByRole("button", { name: "Tout refuser", exact: true });
  await refuseCookies.waitFor({ state: "visible", timeout: 3_000 }).catch(() => undefined);
  if (await refuseCookies.isVisible().catch(() => false)) {
    await refuseCookies.click();
  }
  if (options.expectTitle !== false) {
    await expect(page.getByRole("heading", { name: "Configurez votre profil", exact: true })).toBeVisible({ timeout: 30_000 });
  }
  await expect(page.getByRole("navigation", { name: "Progression de la configuration", exact: true })).toBeVisible();
}

test("onboarding Clerk Development progresse sans perte de saisie", async ({ page }) => {
  await openOnboarding(page);

  const firstName = page.getByRole("textbox", { name: /^Prénom/ });
  const lastName = page.getByRole("textbox", { name: /^Nom/ });
  if (!(await firstName.inputValue())) await firstName.fill("CleanMyMap");
  if (!(await lastName.inputValue())) await lastName.fill("E2E");
  const preservedFirstName = await firstName.inputValue();
  await expect(page.getByText("Identité publique prévisualisée", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Pseudonyme/ })).toBeVisible();

  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Utilisation de CleanMyMap", exact: true })).toBeVisible();
  await expect(page.getByText("réellement attribués à votre compte Clerk", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Demander officiellement une évolution du compte", exact: true })).toHaveAttribute("href", "/compte/evolution");

  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Localisation", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Ne pas renseigner de lieu", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Précédent", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Utilisation de CleanMyMap", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Précédent", exact: true }).click();
  await expect(firstName).toHaveValue(preservedFirstName);
});

test("onboarding reste navigable sur un viewport mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openOnboarding(page, { expectTitle: false });
  await expect(page.getByRole("button", { name: "Découvrir le ruban", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Suivant", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Configurer plus tard", exact: true })).toBeVisible();
});

test("onboarding expose le tutoriel sans soumettre ni perdre les saisies", async ({ page }) => {
  await openOnboarding(page);

  const tutorialTrigger = page.getByRole("button", { name: "Découvrir le ruban", exact: true });
  await expect(tutorialTrigger).toHaveAttribute("type", "button");
  await expect(tutorialTrigger).toBeVisible();
  const firstName = page.getByRole("textbox", { name: /^Prénom/ });
  const before = await firstName.inputValue();

  await tutorialTrigger.click();
  const panel = page.getByRole("region", { name: "Tutoriel du ruban de navigation" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Accueil" })).toBeVisible();
  await expect(page.locator("[data-navigation-ribbon-tour-blocker]")).toHaveCount(4);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(firstName).toHaveValue(before);

  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Utilisation de CleanMyMap", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Découvrir le ruban", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Localisation", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Découvrir le ruban", exact: true })).toBeVisible();
});
