import { expect, test } from "@playwright/test";

const openAiUsageFixture = {
  object: "page", data: [{ object: "bucket", start_time: 1730419200, end_time: 1730505600, results: [{
    input_tokens: 1000, input_cached_tokens: 400, input_cache_write_tokens: 100, input_uncached_tokens: 500,
    output_tokens: 500, num_model_requests: 5, model: null, project_id: "project-fixture", api_key_id: "key-fixture",
  }] }], has_more: false, next_page: null,
};

test("authenticated user saves and manages a private chatbot scenario without token values", async ({ page }) => {
  await page.goto("/learn/empreinte-ia");
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await page.getByLabel("Chatbot").selectOption("CHATGPT");
  await page.getByLabel("Je ne sais pas la période").uncheck();
  await page.getByLabel("Période (début inclus, fin exclue)").fill("2026-11-01");
  await page.getByLabel("Fin de période (UTC)").fill("2026-11-02");
  await page.getByLabel("Fréquence approximative").selectOption("DAILY");
  await page.getByLabel("Nombre d’échanges sur cette période (facultatif)").fill("3");
  await page.getByLabel("Offre utilisée (n’influence pas le calcul énergétique)").selectOption("SUBSCRIPTION");
  await page.getByRole("button", { name: "Calculer sans compte" }).click();
  await expect(page.getByRole("button", { name: "Enregistrer mon scénario" })).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer mon scénario" }).click();
  await expect(page.getByRole("status")).toContainText("Scénario enregistré");
  let item = page.getByTestId("personal-ai-declaration-row").filter({ hasText: "Estimation rapide · CHATGPT" }).first();
  await expect(item).toContainText("Active");

  await item.getByRole("button", { name: "Modifier" }).click();
  await page.getByLabel("Nombre d’échanges sur cette période (facultatif)").fill("5");
  await page.getByRole("button", { name: "Calculer sans compte" }).click();
  await page.getByRole("button", { name: "Enregistrer la modification" }).click();
  await expect(page.getByRole("status")).toContainText("Scénario enregistré");

  item = page.getByTestId("personal-ai-declaration-row").filter({ hasText: "Estimation rapide · CHATGPT" }).first();
  await item.getByRole("button", { name: "Exclure" }).click();
  await expect(item).toContainText("Exclue");
  await item.getByRole("button", { name: "Réactiver" }).click();
  await expect(item).toContainText("Active");
  page.once("dialog", (dialog) => dialog.accept());
  await item.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByTestId("personal-ai-declaration-row").filter({ hasText: "Estimation rapide · CHATGPT" })).toHaveCount(0);
});

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
  expect(JSON.parse(postedBody).rows[0]).toHaveProperty("sourceScope");
  expect(postedBody).not.toContain("key-fixture");
});
