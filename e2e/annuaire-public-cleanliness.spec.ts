import { expect, test } from "@playwright/test";

async function dismissCookies(page: import("@playwright/test").Page) {
  const refuseCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await refuseCookies.isVisible().catch(() => false)) await refuseCookies.click();
}

test("desktop: unmounts an initialized WebGL scene and restores network selections", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sections/annuaire");
  await page.waitForLoadState("networkidle");
  await dismissCookies(page);

  const networkTab = page.getByRole("tab", { name: "Réseau 3D des cleanwalks" });
  const organizationTab = page.getByRole("tab", { name: "Organisation des services publics" });
  const networkPanel = page.locator("#annuaire-panel-network");
  await expect(networkTab).toHaveAttribute("aria-selected", "true");
  await page.locator("#paris-cleanwalk-network-3d").scrollIntoViewIfNeeded();
  const canvas = networkPanel.locator("canvas");
  await expect(canvas).toHaveCount(1, { timeout: 20_000 });

  await networkPanel.getByRole("combobox", { name: "Filtrer par type d'acteur" }).selectOption("collectivite_mairie");
  await networkPanel.getByRole("combobox", { name: "Filtrer par arrondissement" }).selectOption("5");

  const selectedActor = networkPanel.getByRole("button", { name: "Mairie du 5e arrondissement de Paris" });
  await expect(selectedActor).toBeVisible();
  await selectedActor.click();
  await expect(networkPanel.locator('button[aria-pressed="true"]').filter({ hasText: "Mairie du 5e arrondissement de Paris" })).toBeVisible();

  await organizationTab.click();
  await expect(page.locator("#annuaire-panel-organization")).toBeVisible();
  await expect(canvas).toHaveCount(0);

  await networkTab.click();
  await expect(canvas).toHaveCount(1, { timeout: 20_000 });
  await expect(networkPanel.getByRole("combobox", { name: "Filtrer par type d'acteur" })).toHaveValue("collectivite_mairie");
  await expect(networkPanel.getByRole("combobox", { name: "Filtrer par arrondissement" })).toHaveValue("5");
  await expect(networkPanel.locator('button[aria-pressed="true"]').filter({ hasText: "Mairie du 5e arrondissement de Paris" })).toBeVisible();
});

test("mobile: filters, progressive navigation, zoom, sources and roving tab focus work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sections/annuaire");
  await page.waitForLoadState("networkidle");
  await dismissCookies(page);

  const networkTab = page.getByRole("tab", { name: "Réseau 3D des cleanwalks" });
  const organizationTab = page.getByRole("tab", { name: "Organisation des services publics" });
  await expect(networkTab).toHaveAttribute("tabindex", "0");
  await expect(organizationTab).toHaveAttribute("tabindex", "-1");
  await networkTab.click();
  await page.keyboard.press("ArrowRight");
  await expect(organizationTab).toBeFocused();
  await expect(organizationTab).toHaveAttribute("aria-selected", "true");
  await expect(networkTab).toHaveAttribute("tabindex", "-1");
  await expect(page.locator("#annuaire-panel-network canvas")).toHaveCount(0);

  const organization = page.getByTestId("public-cleanliness-organization");
  await organization.getByRole("combobox", { name: "Sélectionner une ville" }).selectOption("Lyon");
  await expect(organization.getByRole("status")).toContainText("Aucun référentiel institutionnel n’a encore été validé pour Lyon");
  await expect(organization.locator("aside h3")).toHaveCount(0);
  await organization.getByRole("combobox", { name: "Sélectionner une ville" }).selectOption("Paris");
  await organization.getByRole("combobox", { name: "Filtrer par arrondissement" }).selectOption("20");
  await organization.getByRole("combobox", { name: "Filtrer par service" }).selectOption("coordination");
  await organization.getByRole("searchbox", { name: "Rechercher dans l’organigramme" }).fill("REQ");
  await organization.getByRole("button", { name: /Référents et référentes de l'entretien du quartier/ }).last().click();
  await expect(organization.locator("aside h3")).toContainText("Référents et référentes");
  await expect(organization.locator("aside")).toContainText("Affectation inconnue");

  await organization.getByRole("combobox", { name: "Filtrer par service" }).selectOption("all");
  await organization.getByRole("searchbox", { name: "Rechercher dans l’organigramme" }).clear();
  await organization.getByRole("combobox", { name: "Filtrer par arrondissement" }).selectOption("");
  const dpe = organization.getByRole("button", { name: /Direction de la Propreté et de l'Eau/ }).last();
  await dpe.click();
  await expect(organization.getByText("Sources de cette relation:").first()).toBeVisible();
  const relatedReq = organization.getByRole("button", { name: /Explorer: Référents et référentes/ });
  await relatedReq.click();
  await expect(organization.locator("aside h3")).toContainText("Référents et référentes");
  await expect(organization.locator("aside").getByRole("link", { name: /Offre REQ du 20e/ }).first()).toBeVisible();

  await organization.getByRole("button", { name: "Augmenter le zoom" }).click();
  await expect(organization.getByRole("button", { name: "Réinitialiser le zoom" })).toHaveText("110%");
  await organization.getByRole("button", { name: "Réinitialiser le zoom" }).click();
  await expect(organization.getByRole("button", { name: "Réinitialiser le zoom" })).toHaveText("100%");

  const matrixToggle = organization.getByRole("button", { name: "Couverture institutionnelle par arrondissement" });
  await matrixToggle.click();
  const matrix = organization.getByRole("table", { name: "Couverture institutionnelle par arrondissement" });
  await expect(matrix.locator("tbody tr")).toHaveCount(20);
  await expect(matrix.getByText("Accueil propreté : 01 55 34 77 17").first()).toBeVisible();
  await matrix.getByRole("button", { name: "Carine Ekon", exact: true }).click();
  await expect(organization.locator("aside h3")).toHaveText("Carine Ekon");
  await expect(organization.locator("aside")).toContainText("Mandat politique");
  await expect(organization.locator("aside")).toBeFocused();
  await expect(page.locator("#annuaire-panel-network canvas")).toHaveCount(0);

  await networkTab.click();
  await expect(page.locator("#annuaire-panel-network")).toBeVisible();
  await expect(organization.locator("canvas")).toHaveCount(0);
});
