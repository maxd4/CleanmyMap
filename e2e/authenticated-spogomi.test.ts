import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page): Promise<void> {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) throw new Error("The official Clerk E2E user email was not provisioned.");
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
}

async function rejectCookies(page: Page): Promise<void> {
  const reject = page.getByRole("button", { name: "Tout refuser" });
  if (await reject.isVisible().catch(() => false)) await reject.click();
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90000);

test.describe("SPOGOMI private authenticated journeys", () => {
  let eventSlug: string | null = null;

  test("requires Clerk for private creation, then creates a synthetic private edition", async ({ page }) => {
    const anonymousPage = await page.context().newPage();
    const anonymousResponse = await anonymousPage.goto("/spogomi/nouveau");
    expect(anonymousResponse?.status()).toBe(200);
    await expect(anonymousPage).toHaveURL(/\/sign-in\?redirect_url=%2Fspogomi%2Fnouveau/);
    await anonymousPage.close();

    await page.goto("/spogomi/nouveau");
    await rejectCookies(page);
    await signIn(page);
    await page.goto("/spogomi/nouveau");
    await expect(page.getByRole("heading", { name: "Nouvelle compétition SPOGOMI" })).toBeVisible();

    const name = `SPOGOMI E2E synthétique ${Date.now()}`;
    await page.getByLabel("Nom").fill(name);
    await page.getByLabel("Lieu").fill("Lieu synthétique E2E");
    await page.getByLabel("Mode").selectOption("casual");
    await page.getByLabel("Début").fill("2030-06-01T10:00");
    const creationResponse = page.waitForResponse((response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/api/spogomi/events",
    );
    await page.getByRole("button", { name: "Créer en privé" }).click();
    expect((await creationResponse).status()).toBe(201);
    await expect(page.getByRole("status")).toContainText("Compétition créée en privé");

    await page.goto("/spogomi/mes-evenements");
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    const managementLinks = page.getByRole("link", { name: /Gérer cette compétition/ });
    await expect(managementLinks.last()).toBeVisible();
    const href = await managementLinks.last().getAttribute("href");
    expect(href).toMatch(/^\/spogomi\/[^/]+\/espace$/);
    eventSlug = href?.split("/")[2] ?? null;
    expect(eventSlug).toBeTruthy();
  });

  test("keeps the private cockpit scoped and supports roster preview, mapping and composition preview", async ({ page }) => {
    expect(eventSlug).toBeTruthy();
    await page.goto(`/spogomi/${eventSlug}/espace`);
    await expect(page.getByRole("navigation", { name: "Navigation SPOGOMI" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Sections de l’espace événementiel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Équipes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Accueil et présences" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Résultats" })).toBeVisible();

    await page.getByRole("button", { name: "Équipes" }).click();
    const rosterInput = page.locator('input[type="file"][accept*=".csv"]').first();
    await expect(rosterInput).toBeVisible();
    await rosterInput.setInputFiles({
      name: "synthetic-roster.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("ticketReference,name\nSPOGOMI-E2E-1,Participant synthétique\nSPOGOMI-E2E-2,\n", "utf8"),
    });
    await expect(page.getByText(/lignes lues/)).toBeVisible();
    await expect(page.getByText(/anomalies/)).toBeVisible();
    await expect(page.getByText(/colonnes inconnues/)).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Référence billet/ })).toHaveValue("ticketReference");
    await expect(page.getByRole("button", { name: "Confirmer la sélection" })).toBeEnabled();
    await page.getByRole("button", { name: "Confirmer la sélection" }).click();
    await expect(page.getByRole("status")).toContainText("Opération enregistrée");

    await page.getByRole("button", { name: "Prévisualiser ou régénérer" }).click();
    await expect(page.getByText(/Aperçu explicable/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmer cette proposition" })).toBeVisible();
    await expect(page.getByText(/place\(s\) en attente/i)).toBeVisible();
  });

  test("shows the failure boundary for an unauthorized or unknown private event", async ({ page }) => {
    const response = await page.goto("/spogomi/event-that-does-not-exist/espace");
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/introuvable|not found|indisponible/i).first()).toBeVisible();
  });
});
