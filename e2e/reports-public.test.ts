import { expect, test } from "@playwright/test";

test.describe("Reports public and protected boundaries", () => {
  test("keeps public analysis visible while protecting generation and action history", async ({ page }) => {
    const reportsResponse = await page.goto("/reports?tab=analysis");

    expect(reportsResponse?.status()).toBeLessThan(500);
    await expect(page.getByRole("navigation", { name: "Onglets des rapports" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Analyse", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByTestId("reports-public-summary").or(page.getByRole("alert")).first(),
    ).toBeVisible();

    await page.getByRole("link", { name: "Génération", exact: true }).click();
    await expect(page).toHaveURL(/\/reports\?tab=generation$/);
    await expect(page.getByRole("heading", { name: /Connexion requise|Authentification temporairement indisponible/ }).first()).toBeVisible();

    const historyResponse = await page.goto("/actions/history");
    expect(historyResponse?.status()).toBeLessThan(500);
    if (page.url().includes("/sign-in")) {
      await expect(page.getByRole("heading", { name: /Sign in|Connexion requise/ }).first()).toBeVisible();
      await expect(page).toHaveURL(/redirect_url=.*actions%2Fhistory/);
    } else {
      await expect(page.getByRole("heading", { name: /Connexion requise|Authentification temporairement indisponible/ }).first()).toBeVisible();
    }
  });

  test("executes public library filters and preserves an explicit empty or unavailable state", async ({ page }) => {
    await page.route("**/api/reports/library?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [{
            id: "public-e2e-1",
            title: "Rapport public E2E",
            period: "Six mois",
            scope: "Global",
            theme: "scientific",
            publishedAt: "2026-10-20T10:00:00.000Z",
            authorLabel: null,
            viewUrl: "/api/reports/library/public-e2e-1/pdf",
            downloadUrl: "/api/reports/library/public-e2e-1/pdf?download=1",
          }],
          page: 1,
          pageSize: 12,
          total: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        }),
      });
    });

    const response = await page.goto("/reports?tab=library");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: "Tous les fichiers" })).toBeVisible();

    await page.getByRole("textbox", { name: "Rechercher par titre" }).fill("public");
    await page.getByRole("combobox", { name: "Période" }).selectOption("six_months");
    await page.getByRole("combobox", { name: "Thème" }).selectOption("scientific");
    await page.getByRole("button", { name: "Filtrer" }).click();

    await expect(page.getByText("Rapport public E2E", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Consulter" })).toHaveAttribute("href", "/api/reports/library/public-e2e-1/pdf");
    await expect(page.getByRole("link", { name: "Télécharger PDF" })).toHaveAttribute("href", "/api/reports/library/public-e2e-1/pdf?download=1");
  });
});
