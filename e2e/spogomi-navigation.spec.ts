import { expect, test } from "@playwright/test";

test.describe("SPOGOMI public navigation", () => {
  test("orients each public role without changing permissions", async ({ page }) => {
    const response = await page.goto("/spogomi");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("link", { name: "Voir les compétitions" }).first()).toHaveAttribute("href", "#spogomi-events");
    await expect(page.getByRole("link", { name: "Ouvrir le salon SPOGOMI" }).first()).toHaveAttribute(
      "href",
      "/sections/messagerie?tab=discussions&channel=community&topicId=spogomi",
    );
    await expect(page.getByRole("tab", { name: "Bénévoles" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Rejoindre", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Arbitres & modération" }).click();
    await expect(page.getByText("Certifier", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ouvrir l’espace organisateur" })).toHaveCount(0);
    await expect(page.getByText("Aucun accès arbitre générique", { exact: false })).toBeVisible();

    await page.getByRole("tab", { name: "Organisateurs" }).click();
    await expect(page.getByText("Créer", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ouvrir l’espace organisateur" })).toHaveCount(0);
  });

  test("reaches the public index from future actions", async ({ page }) => {
    const indexResponse = await page.goto("/spogomi");
    expect(indexResponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "SPOGOMI", exact: true })).toBeVisible();

    const joinResponse = await page.goto("/sections/rejoindre-une-action");
    expect(joinResponse?.status()).toBe(200);
    await expect(page.getByText("Compétitions SPOGOMI", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Découvrir SPOGOMI" }).click();
    await expect(page).toHaveURL(/\/spogomi$/);
  });
});
