import { expect, test } from "@playwright/test";

async function dismissCookies(page: import("@playwright/test").Page) {
  const refuseCookies = page.getByRole("button", { name: "Tout refuser" });
  await refuseCookies.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  if (await refuseCookies.isVisible().catch(() => false)) {
    await refuseCookies.click();
    await refuseCookies.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
  }
}

test("desktop: fits the complete institutional graph and switches to the geographic network", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sections/annuaire");
  await dismissCookies(page);
  const organization = page.getByTestId("public-cleanliness-organization");
  await expect(organization.locator('[data-org-node-id="city-paris"]')).toBeVisible();
  await expect(organization.locator('[data-org-node-id="dpe"]')).toBeVisible();
  await expect(organization.locator('[data-org-node-id="person-carine-ekon"]')).toBeVisible();
  await organization.getByRole("button", { name: "Cadrer", exact: true }).click();
  const nodes = organization.locator("[data-org-node-id]");
  expect(await nodes.count()).toBeGreaterThan(10);
  await page.getByRole("tab", { name: "Carte & réseau" }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.getByRole("tab", { name: "Services publics" }).click();
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
});

test("desktop: navigates between explicit shared institutional identities", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sections/annuaire");
  await dismissCookies(page);
  await page.getByRole("tab", { name: "Carte & réseau" }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  const network = page.locator("#annuaire-panel-network");
  await network.getByRole("searchbox").fill("Syctom");
  await network.getByRole("button", { name: /Syctom/i }).first().click();
  await network.getByRole("button", { name: "Voir dans les services publics" }).click();
  await expect(page.getByRole("tab", { name: "Services publics" })).toBeFocused();
  const organization = page.getByTestId("public-cleanliness-organization");
  await expect(organization.locator("aside h3")).toContainText("Syctom");
  await organization.getByRole("button", { name: "Voir dans le réseau des acteurs" }).click();
  await expect(page.getByRole("tab", { name: "Carte & réseau" })).toBeFocused();
  await expect(network.locator("aside")).toContainText("Syctom");
});

test("desktop: geographic WebGL renders and exposes camera controls when available", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/sections/annuaire");
  await dismissCookies(page);
  await page.getByRole("tab", { name: "Carte & réseau" }).click();
  const network = page.locator("#annuaire-panel-network");
  // This test requires an actual WebGL-capable harness; a fallback is not a 3D pass.
  await expect(network.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(network.getByText("Chargement de la carte 3D…")).toHaveCount(0);
  await network.getByRole("button", { name: "Tourner →" }).click();
  await network.getByRole("button", { name: "Incliner +" }).click();
  await expect(network.locator("[data-network-pin]").first()).toBeVisible();
  await page.getByRole("tab", { name: "Services publics" }).click();
  await expect(network.locator("canvas")).toHaveCount(0);
});

test("mobile: filters, progressive navigation, zoom, sources and roving tab focus work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sections/annuaire");
  await dismissCookies(page);

  const networkTab = page.getByRole("tab", { name: "Carte & réseau" });
  const organizationTab = page.getByRole("tab", { name: "Services publics" });
  await expect(networkTab).toBeVisible();
  await expect(organizationTab).toBeVisible();
  await networkTab.click();
  await expect(networkTab).toHaveAttribute("tabindex", "0");
  await expect(organizationTab).toHaveAttribute("tabindex", "-1");
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
  await expect(organization.locator("aside")).toContainText("Non établi");

  await organization.getByRole("combobox", { name: "Filtrer par service" }).selectOption("all");
  await organization.getByRole("searchbox", { name: "Rechercher dans l’organigramme" }).clear();
  await organization.getByRole("combobox", { name: "Filtrer par arrondissement" }).selectOption("");
  await organization.getByRole("button", { name: "Liste", exact: true }).click();
  const dpe = organization.getByRole("list", { name: "Arborescence des services publics de propreté" }).getByRole("button", { name: /^Direction de la Propreté/ }).first();
  await dpe.click();
  await expect(organization.locator("aside h3")).toContainText("Propreté");
  await organization.getByRole("button", { name: "Organigramme", exact: true }).click();
  await expect(organization.locator("aside").getByText("Sources et preuve").first()).toBeVisible();
  const relationsSummary = organization.locator("aside summary", { hasText: "Relations (" }).first();
  if (await relationsSummary.isVisible().catch(() => false)) await relationsSummary.click();
  const reqRelationDetails = organization.locator("aside details details").filter({ hasText: /Référents et référentes/ }).first();
  await reqRelationDetails.locator("summary").click();
  const relatedReq = reqRelationDetails.getByRole("button", { name: /Référents et référentes/ }).first();
  await relatedReq.click();
  await expect(organization.locator("aside h3")).toContainText("Référents et référentes");
  await expect(organization.locator("aside").getByRole("link", { name: /Offre REQ du 20e/ }).first()).toBeVisible();

  await organization.getByRole("button", { name: "Augmenter le zoom" }).click();
  await expect(organization.getByRole("button", { name: "Réinitialiser le zoom" })).toHaveText("110%");
  await organization.getByRole("button", { name: "Réinitialiser le zoom" }).click();
  await expect(organization.getByRole("button", { name: "Réinitialiser le zoom" })).toHaveText("100%");

  const needPanel = organization.getByRole("region", { name: "Qui contacter ?" });
  await organization.getByRole("combobox", { name: "Filtrer par arrondissement" }).selectOption("20");
  await needPanel.getByLabel("Besoin de l'organisateur").selectOption("equipment");
  await expect(needPanel).toContainText("Pinces");
  await expect(needPanel).toContainText("non établis");
  await needPanel.getByLabel("Besoin de l'organisateur").selectOption("storage");
  await expect(needPanel).toContainText("demande préalable");
  await needPanel.getByRole("button", { name: "Déchèteries et Espaces tri municipaux", exact: true }).click();
  await expect(organization.locator("aside h3")).toHaveText("Déchèteries et Espaces tri municipaux");
  await expect(organization.locator("aside")).toBeFocused();

  const matrixToggle = organization.getByRole("button", { name: "Couverture institutionnelle par arrondissement" });
  await matrixToggle.click();
  const matrix = organization.getByRole("table", { name: "Couverture institutionnelle par arrondissement" });
  await expect(matrix.locator("tbody tr")).toHaveCount(20);
  await expect(matrix.getByText("Accueil propreté : 01 55 34 77 17").first()).toBeVisible();
  await matrix.getByRole("button", { name: "Carine Ekon", exact: true }).click();
  await expect(organization.locator("aside h3")).toHaveText("Carine Ekon");
  await expect(organization.locator("aside")).toContainText("Mandat · Documenté");
  await expect(organization.locator("aside")).toBeFocused();
  await expect(page.locator("#annuaire-panel-network canvas")).toHaveCount(0);

  await networkTab.click();
  await expect(page.locator("#annuaire-panel-network")).toBeVisible();
  await expect(organization.locator("canvas")).toHaveCount(0);
});
