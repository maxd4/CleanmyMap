import { expect, test } from "@playwright/test";

test("anonymous user calculates a qualified AI footprint without private writes", async ({ page }) => {
  let privateApiCalls = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/personal-ai/declarations")) privateApiCalls += 1;
  });
  await page.goto("/methodologie");
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await page.getByRole("button", { name: "Cartographie & Impact" }).click();
  await page.locator('[data-methodology-route-id="methodologie"] summary').click();
  await expect(page.getByRole("link", { name: "Déclarer et estimer mon usage IA" })).toHaveAttribute("href", "/learn/empreinte-ia");
  await page.goto("/learn/empreinte-ia");
  await expect(page.getByRole("heading", { name: "Mon empreinte IA" })).toBeVisible();
  await page.getByLabel("Tokens d’entrée déclarés").fill("30000");
  await page.getByLabel("Tokens de sortie visibles").fill("3000");
  await page.getByRole("button", { name: "Calculer" }).click();
  await expect(page.getByRole("heading", { name: "Résultats qualifiés" })).toBeVisible();
  await expect(page.getByText(/Qualité des données/)).toBeVisible();
  await expect(page.getByText(/aucune compensation carbone ou hydrique/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Connectez-vous pour enregistrer cette déclaration" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enregistrer dans mon espace privé" })).toHaveCount(0);
  expect(privateApiCalls).toBe(0);
});
