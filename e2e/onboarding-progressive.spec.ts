import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

async function openOnboarding(page: Page): Promise<void> {
  const response = await page.goto("/onboarding?next=%2Fprofil", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Configurez votre profil", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: "Progression de la configuration", exact: true })).toBeVisible();
  const refuseCookies = page.getByRole("button", { name: "Tout refuser", exact: true });
  if (await refuseCookies.isVisible().catch(() => false)) {
    await refuseCookies.click();
  }
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
  await openOnboarding(page);
  await expect(page.getByRole("button", { name: "Suivant", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Configurer plus tard", exact: true })).toBeVisible();
});
