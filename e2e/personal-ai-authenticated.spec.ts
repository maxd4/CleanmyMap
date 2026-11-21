import { expect, test } from "@playwright/test";

test("authenticated user saves, edits, excludes, reactivates and deletes only personal declarations", async ({ page }) => {
  await page.goto("/learn/empreinte-ia");
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await expect(page.getByRole("heading", { name: "Mes déclarations privées" })).toBeVisible();
  await page.getByLabel("Tokens d’entrée déclarés").fill("42000");
  await page.getByLabel("Tokens de sortie visibles").fill("5000");
  await page.getByRole("button", { name: "Calculer" }).click();
  await page.getByRole("button", { name: "Enregistrer dans mon espace privé" }).click();
  await expect(page.getByRole("status")).toContainText("Déclaration enregistrée");
  const item = page.getByTestId("personal-ai-declaration-row").first();
  await expect(item).toBeVisible();

  await item.getByRole("button", { name: "Modifier" }).click();
  await page.getByLabel("Tokens d’entrée déclarés").fill("43000");
  await page.getByRole("button", { name: "Calculer" }).click();
  await page.getByRole("button", { name: "Enregistrer la modification" }).click();
  await expect(page.getByRole("status")).toContainText("Déclaration enregistrée");

  const updatedItem = page.getByTestId("personal-ai-declaration-row").first();
  await updatedItem.getByRole("button", { name: "Exclure" }).click();
  await expect(updatedItem).toContainText("Exclue");
  await updatedItem.getByRole("button", { name: "Réactiver" }).click();
  await expect(updatedItem).toContainText("Active");

  page.once("dialog", (dialog) => dialog.accept());
  await updatedItem.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByTestId("personal-ai-declaration-row")).toHaveCount(0);
});
