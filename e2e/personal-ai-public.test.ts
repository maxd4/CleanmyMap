import { expect, test } from "@playwright/test";

const openAiUsageFixture = {
  object: "page", data: [{ object: "bucket", start_time: 1730419200, end_time: 1730505600, results: [{
    input_tokens: 1000, input_cached_tokens: 400, input_cache_write_tokens: 100, input_uncached_tokens: 500,
    output_tokens: 500, num_model_requests: 5, model: null, project_id: "project-fixture", api_key_id: "key-fixture",
  }] }], has_more: false, next_page: null,
};

function textualInvoicePdf(): Buffer {
  const stream = "BT /F1 12 Tf 72 720 Td (Invoice Total EUR 34.20) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(body)); body += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body, "ascii");
}

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
  await page.getByRole("button", { name: "Calculer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Résultats qualifiés" })).toBeVisible();
  await expect(page.getByText(/Qualité des données/)).toBeVisible();
  await expect(page.getByText(/aucune compensation carbone ou hydrique/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Connectez-vous pour enregistrer cette déclaration" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enregistrer dans mon espace privé" })).toHaveCount(0);
  expect(privateApiCalls).toBe(0);
});

test("anonymous chatbot user gets a traceable quick scenario without tokens or private writes", async ({ page }) => {
  let privateApiCalls = 0;
  page.on("request", (request) => { if (request.url().includes("/api/personal-ai/declarations")) privateApiCalls += 1; });
  await page.goto("/learn/empreinte-ia");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await expect(page.getByRole("heading", { name: "Estimation rapide" })).toBeVisible();
  await page.getByLabel("Chatbot").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Je ne sais pas la période")).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel("Chatbot").selectOption("CHATGPT");
  await page.getByLabel("Je ne sais pas la période").uncheck();
  await page.getByLabel("Période (début inclus, fin exclue)").fill("2026-11-01");
  await page.getByLabel("Fin de période (UTC)").fill("2026-11-08");
  await page.getByLabel("Fréquence approximative").selectOption("SEVERAL_WEEKLY");
  await page.getByLabel("Nombre d’échanges sur cette période (facultatif)").fill("24");
  await page.getByLabel("Longueur habituelle d’une question, en caractères (facultatif)").fill("160");
  await page.getByLabel("Longueur habituelle d’une réponse, en caractères (facultatif)").fill("800");
  await page.getByLabel("Offre utilisée (n’influence pas le calcul énergétique)").selectOption("FREE");
  await page.getByRole("button", { name: "Calculer sans compte" }).click();
  await expect(page.getByRole("heading", { name: "Votre activité déclarée" })).toBeVisible();
  await expect(page.getByText(/Énergie attribuable à cette activité : NA kWh/)).toBeVisible();
  await expect(page.getByText(/les longueurs visibles ne révèlent ni les tokens réellement traités/i)).toBeVisible();

  await page.getByLabel("Simulation régionale séparée (hypothétique)").selectOption("FR");
  await page.getByRole("button", { name: "Calculer sans compte" }).click();
  await expect(page.getByRole("heading", { name: "Simulation indépendante : 1 million de tokens hypothétiques" })).toBeVisible();
  await expect(page.getByText(/scénarios bas, central et haut sont des sensibilités/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Connectez-vous pour enregistrer ce scénario privé" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enregistrer mon scénario" })).toHaveCount(0);
  expect(privateApiCalls).toBe(0);
});

test("anonymous user previews a local provider export without sending the file", async ({ page }) => {
  const privateRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/personal-ai/")) privateRequests.push(request.url());
  });
  await page.goto("/learn/empreinte-ia");
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await page.getByLabel("Sélectionner un relevé IA").setInputFiles({
    name: "organization-usage.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(openAiUsageFixture)),
  });
  await expect(page.getByRole("heading", { name: "Aperçu · 1 ligne(s)" })).toBeVisible();
  await expect(page.getByText(/Entrée 1[\s\u00a0\u202f]?000 · sortie 500/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Connectez-vous pour confirmer l'import" })).toBeVisible();
  expect(privateRequests).toEqual([]);
});

test("anonymous user extracts a textual invoice cost locally without inventing tokens", async ({ page }) => {
  let privateRequests = 0;
  page.on("request", (request) => { if (request.url().includes("/api/personal-ai/")) privateRequests += 1; });
  await page.goto("/learn/empreinte-ia");
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await page.getByLabel("Sélectionner un relevé IA").setInputFiles({ name: "invoice.pdf", mimeType: "application/pdf", buffer: textualInvoicePdf() });
  await expect(page.getByRole("heading", { name: "Aperçu · 1 ligne(s)" })).toBeVisible();
  await expect(page.getByText(/Entrée NA · sortie NA · coût 34\.2 EUR/)).toBeVisible();
  await expect(page.getByText(/Le coût seul ne permet pas de déduire tokens, énergie ou CO₂e/)).toBeVisible();
  expect(privateRequests).toBe(0);
});
