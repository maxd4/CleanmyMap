import { expect, test } from "@playwright/test";

test("the public 2D institutional tree is navigable and keeps the 3D view dormant", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sections/annuaire");
  await page.waitForLoadState("networkidle");
  const refuseCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await refuseCookies.isVisible().catch(() => false)) await refuseCookies.click();
  await expect(refuseCookies).toHaveCount(0);

  const networkTab = page.getByRole("tab", { name: "Réseau 3D des cleanwalks" });
  const organizationTab = page.getByRole("tab", { name: "Organisation des services publics" });
  await expect(networkTab).toHaveAttribute("aria-selected", "true");
  await networkTab.press("ArrowRight");
  await expect(organizationTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#annuaire-panel-network")).toBeHidden();
  await expect(page.locator("#annuaire-panel-network canvas")).toHaveCount(0);

  const organization = page.getByTestId("public-cleanliness-organization");
  await expect(organization).toBeVisible();
  await expect(organization.getByRole("button", { name: /Direction de la Propreté et de l'Eau/ }).last()).toBeVisible();
  await expect(organization.locator("canvas")).toHaveCount(0);

  await organization.getByRole("searchbox", { name: "Rechercher dans l'organigramme" }).fill("REQ");
  await organization.getByRole("button", { name: /Référents et référentes de l'entretien du quartier/ }).last().click();
  await expect(organization.getByRole("heading", { name: /Référents et référentes.*REQ/ })).toBeVisible();
  await expect(organization.getByText(/affectations actuelles.*ne sont pas établis/i)).toBeVisible();

  await organization.getByRole("searchbox", { name: "Rechercher dans l'organigramme" }).clear();
  await organization.getByRole("combobox", { name: "Sélectionner une ville" }).selectOption("Lyon");
  await expect(organization.getByRole("status")).toContainText("Aucun référentiel institutionnel n'a encore été validé pour Lyon");
  await organization.getByRole("combobox", { name: "Sélectionner une ville" }).selectOption("Paris");
  await organization.getByRole("combobox", { name: "Filtrer par arrondissement" }).selectOption("17");
  await expect(organization.getByRole("button", { name: /Division territoriale 17e/ }).last()).toBeVisible();
  await expect(organization.getByRole("button", { name: /Division territoriale 9e–10e/ })).toHaveCount(0);

  await page.getByRole("tab", { name: "Réseau 3D des cleanwalks" }).click();
  await expect(page.locator("#annuaire-panel-network")).toBeVisible();
  await expect(page.getByText("Réseau 3D des cleanwalks à Paris")).toBeVisible();
});
