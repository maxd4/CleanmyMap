import { expect, test } from "@playwright/test";

const openAiUsageFixture = {
  object: "page", data: [{ object: "bucket", start_time: 1730419200, end_time: 1730505600, results: [{
    input_tokens: 1000, input_cached_tokens: 400, input_cache_write_tokens: 100, input_uncached_tokens: 500,
    output_tokens: 500, num_model_requests: 5, model: null, project_id: null,
  }] }], has_more: false, next_page: null,
};

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

test("authenticated user explicitly confirms a normalized import batch", async ({ page }) => {
  let postedBody = "";
  page.on("request", (request) => {
    if (request.url().endsWith("/api/personal-ai/imports") && request.method() === "POST") postedBody = request.postData() ?? "";
  });
  await page.goto("/learn/empreinte-ia");
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await page.getByLabel("Sélectionner un relevé IA").setInputFiles({
    name: "organization-usage.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(openAiUsageFixture)),
  });
  await expect(page.getByRole("heading", { name: "Aperçu · 1 ligne(s)" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmer 1 ligne(s)" }).click();
  await expect(page.getByRole("status")).toContainText("1 ligne(s) relue(s)");
  await expect(page.getByRole("status")).toContainText("entrée 1 000 · sortie 500");
  expect(postedBody).not.toContain("organization-usage.json");
  expect(postedBody).not.toContain("prompt");
  expect(postedBody).not.toContain("project_id");
  expect(JSON.parse(postedBody).rows[0]).toHaveProperty("sourceIdentityHash");
});
