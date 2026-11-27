import { expect, test } from "@playwright/test";

test("funding: confirmed amounts and unavailable amounts remain distinct", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let fail = true;
  await page.route("**/api/funding/aggregate", route => fail
    ? route.fulfill({ status: 503, json: { error: "unavailable" } })
    : route.fulfill({ json: { currency: "eur", goal: null, updatedAt: "2026-11-26T14:15:00.000Z", categories: {
      equipment: { netAmountCents: 0, currency: "eur" },
      development: { netAmountCents: 1250, currency: "eur" },
    } } }));
  await page.goto("/sections/funding");
  const cookies = page.getByRole("button", { name: "Tout refuser" });
  await cookies.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
  if (await cookies.isVisible().catch(() => false)) await cookies.click();
  const scope = page.locator("[data-funding-page]");
  await expect(scope.getByRole("button", { name: "Réessayer le chargement" })).toBeVisible();
  await expect(scope.locator("[data-funding-stripe-total]")).toHaveCount(0);
  fail = false;
  await scope.getByRole("button", { name: "Réessayer le chargement" }).click();
  await expect(scope.locator("[data-funding-total=equipment]")).toContainText("0,00");
  await expect(scope.locator("[data-funding-stripe-total]")).toContainText("12,50");
  await expect(scope.locator("[data-funding-updated-at]")).toContainText("UTC");
  await expect(scope.getByText(/Montants cumulés depuis le suivi Stripe/)).toBeVisible();
  await expect(scope.getByText("Non intégrées aux totaux")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const expectedCampaignLinks = process.env.FUNDING_ONPARTICIPE_URL?.trim().startsWith("https://") ? 1 : 0;
  await expect(scope.locator('a[href*="onparticipe.fr"]')).toHaveCount(expectedCampaignLinks);
  if (expectedCampaignLinks === 0) {
    await expect(scope.getByRole("link", { name: /contacter/i })).toHaveAttribute("href", "/contact");
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
test("funding: forged success and refunded historical session are not paid", async ({ page }) => {
  await page.route("**/api/funding/checkout-status?**", route => route.fulfill({ json: { confirmed: true, state: "refunded", category: "equipment" } }));
  await page.goto("/sections/funding?status=success");
  await expect(page.locator("[data-funding-return]")).toContainText("Retour de paiement non vérifié");
  await page.goto("/sections/funding?status=success&session_id=cs_test_fixture");
  await expect(page.locator("[data-funding-return]")).toContainText("Contribution intégralement remboursée");
});
test("funding: real GET /api/funding/aggregate fails closed or returns public projection only", async ({ request }) => {
  const response = await request.get("/api/funding/aggregate");
  expect([200, 503]).toContain(response.status());
  const text = await response.text();
  expect(text).not.toMatch(/stripe_|email|stack/i);
  const body = JSON.parse(text) as Record<string, unknown>;
  if (response.status() === 200) {
    expect(body).toMatchObject({ currency: "eur", goal: null });
    expect(body).toHaveProperty("updatedAt");
    expect(body).toHaveProperty("categories.equipment");
    expect(body).toHaveProperty("categories.development");
  } else {
    expect(body).not.toHaveProperty("categories");
  }
});
