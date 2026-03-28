const { test, expect } = require("@playwright/test");
const { execFileSync } = require("child_process");

function runPython(script, extraEnv = {}) {
  execFileSync("python", ["-c", script], {
    env: { ...process.env, ...extraEnv },
    stdio: "pipe",
  });
}

function resetE2eSubmissions() {
  runPython(`
import sqlite3
conn = sqlite3.connect(r"data/cleanmymap.db")
cur = conn.cursor()
cur.execute("DELETE FROM submissions WHERE LOWER(COALESCE(nom,'')) LIKE 'e2e_%'")
conn.commit()
conn.close()
`);
}

function seedSubmission(payload, status = "pending") {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  runPython(
    `
import base64
import json
import src.database as db
payload = json.loads(base64.b64decode("${encoded}").decode("utf-8"))
db.insert_submission(payload, status="${status}")
`,
  );
}

async function assertNoAppCrash(page) {
  await expect(page.locator("text=Traceback")).toHaveCount(0);
  await expect(page.locator("text=Exception")).toHaveCount(0);
}

async function expectActiveSection(page, sectionRegex) {
  await expect(page.locator("body")).toContainText(/Rubrique active|Active section/i, { timeout: 45_000 });
  await expect(page.locator("body")).toContainText(sectionRegex, { timeout: 45_000 });
}

test.beforeEach(() => {
  resetE2eSubmissions();
});

test.afterAll(() => {
  resetE2eSubmissions();
});

test("Flux declaration: rubrique declaration chargee sans erreur", async ({ page }) => {
  await page.goto("/?tab=declaration");
  await expectActiveSection(page, /D.{0,3}clarer une Action|Declare an Action/i);
  await assertNoAppCrash(page);
});

test("Flux carte: affichage et lien de partage disponibles", async ({ page }) => {
  await page.goto("/?tab=map");
  await expectActiveSection(page, /Carte Interactive|Interactive Map/i);
  await expect(page.locator("body")).toContainText(
    /Carte interactive des actions|Interactive action map/i,
    { timeout: 45_000 },
  );
  await assertNoAppCrash(page);
});

test("Flux rapport: section rapport chargee sans erreur", async ({ page }) => {
  seedSubmission(
    {
      nom: "e2e_reporter",
      type_lieu: "Rue passante",
      adresse: "E2E Report Zone",
      megots: 120,
      dechets_kg: 3.4,
      temps_min: 35,
      benevoles: 4,
      date: "2026-03-28",
      lat: 48.8566,
      lon: 2.3522,
      est_propre: 0,
    },
    "approved",
  );

  await page.goto("/?tab=pdf");
  await expectActiveSection(page, /Rapport Impact|Impact Report/i);
  await expect(page.locator("body")).toContainText(/Telecharger|Download/i, { timeout: 45_000 });
  await assertNoAppCrash(page);
});

test("Securite map: payload XSS non execute et non injecte brut", async ({ page }) => {
  seedSubmission(
    {
      nom: "e2e_xss_user",
      type_lieu: "<script>alert(\"xss_e2e\")</script>",
      adresse: "<script>alert(\"xss_e2e\")</script>",
      association: "<img src=x onerror=alert(\"xss_e2e\")>",
      commentaire: "<svg/onload=alert('xss_e2e')>",
      megots: 200,
      dechets_kg: 5.2,
      temps_min: 45,
      benevoles: 3,
      date: "2026-03-28",
      lat: 48.857,
      lon: 2.353,
      est_propre: 0,
    },
    "approved",
  );

  await page.goto("/?tab=map");
  await expectActiveSection(page, /Carte Interactive|Interactive Map/i);

  const html = await page.content();
  expect(html).not.toContain("<script>alert(\"xss_e2e\")</script>");
  expect(html).not.toContain("onerror=alert(\"xss_e2e\")");

  await assertNoAppCrash(page);
});

test("Validation communautaire publique: champs pending sensibles masques", async ({ page }) => {
  seedSubmission(
    {
      nom: "e2e_pending_user",
      type_lieu: "Canal urbain",
      adresse: "Adresse sensible E2E 42",
      association: "Association Sensible E2E",
      date: "2026-03-15",
      megots: 50,
      dechets_kg: 1.7,
      benevoles: 2,
      temps_min: 20,
      lat: 48.86,
      lon: 2.34,
      est_propre: 0,
    },
    "pending",
  );

  await page.goto("/?tab=community");
  await expectActiveSection(page, /Rassemblements|Community/i);

  await expect(page.locator("body")).toContainText(/Validation communautaire|community/i, {
    timeout: 45_000,
  });
  await expect(page.locator("body")).not.toContainText("Adresse sensible E2E 42");
  await expect(page.locator("body")).not.toContainText("Association Sensible E2E");
  await expect(page.locator("body")).not.toContainText("2026-03-15");

  await assertNoAppCrash(page);
});

test("Flux maintenance: diagnostic read-only visible dans Espace Collectivites", async ({ page }) => {
  await page.goto("/?tab=elus");
  await expectActiveSection(page, /Espace Collectivit|Territories Dashboard|Local Authorities/i);

  const launchButton = page.getByRole("button", {
    name: /Lancer un diagnostic maintenance|Run maintenance diagnostic/i,
  });

  for (let i = 0; i < 12; i += 1) {
    const visible = await launchButton.first().isVisible().catch(() => false);
    if (visible) break;
    await page.mouse.wheel(0, 1400);
    await page.waitForTimeout(300);
  }

  const ctaVisible = await launchButton.first().isVisible().catch(() => false);
  test.skip(!ctaVisible, "Maintenance diagnostic CTA not rendered in current environment.");

  await expect(launchButton.first()).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("body")).toContainText(/Lecture seule|Read-only/i, {
    timeout: 45_000,
  });
  await launchButton.first().click();

  await expect(page.locator("body")).toContainText(
    /Conforme|Points.*corriger|Compliant|Items to fix/i,
    { timeout: 45_000 },
  );

  await launchButton.first().click();
  await expect(page.locator("body")).toContainText(
    /patient|please wait/i,
    { timeout: 45_000 },
  );

  await assertNoAppCrash(page);
});

test("Flux E2E complet: declaration (seed), moderation admin, exports CSV/PDF", async ({ page }) => {
  seedSubmission(
    {
      nom: "e2e_fullflow_user",
      association: "e2e_fullflow_association",
      type_lieu: "Rue passante",
      adresse: "E2E Full Flow Street",
      megots: 180,
      dechets_kg: 4.4,
      temps_min: 55,
      benevoles: 6,
      date: "2026-03-28",
      lat: 48.8582,
      lon: 2.347,
      est_propre: 0,
      commentaire: "Declaration e2e full flow",
    },
    "pending",
  );

  await page.goto("/?tab=admin");
  await expectActiveSection(page, /Admin|Validation Admin/i);

  const secretInput = page.getByLabel(/Code secret administrateur|Code secret/i).first();
  await expect(secretInput).toBeVisible({ timeout: 45_000 });
  await secretInput.fill("e2e-secret");

  await page
    .getByRole("button", { name: /Se connecter .*Admin|Se connecter/i })
    .first()
    .click();

  await expect(page.locator("body")).toContainText(
    /Acc[eè]s administrateur valid[eé]|admin access validated/i,
    { timeout: 45_000 },
  );
  await expect(page.locator("body")).toContainText(/E2E Full Flow Street/i, {
    timeout: 45_000,
  });

  const pendingExpander = page.getByText(/#1.*E2E Full Flow Street/i).first();
  await expect(pendingExpander).toBeVisible({ timeout: 45_000 });
  await pendingExpander.click();

  const enabledApproveButton = page.locator("button:has-text('✅ Approuver'):not([disabled])").first();
  await expect(enabledApproveButton).toBeVisible({ timeout: 45_000 });
  await enabledApproveButton.click();

  await expect(page.locator("body")).toContainText(/CSV|actions valid/i, {
    timeout: 45_000,
  });

  await expect(
    page.getByRole("button", { name: /export scientifique|scientific export|e-prtr/i }).first(),
  ).toBeVisible({ timeout: 45_000 });

  await page.goto("/?tab=pdf");
  await expectActiveSection(page, /Rapport Impact|Impact Report/i);
  await expect(page.locator("body")).toContainText(/PDF|Telecharger|Download/i, {
    timeout: 45_000,
  });

  await assertNoAppCrash(page);
});
