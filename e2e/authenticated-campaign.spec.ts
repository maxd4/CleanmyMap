import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertGroupJoinFixtureIsPresent,
  cleanupGroupJoinFixtureParticipants,
  GROUP_JOIN_FIXTURE_ID,
} from "./fixtures/group-join-fixture";

const evidenceDirectory = path.join(process.cwd(), "artifacts", "playwright", "authenticated-campaign-1d");
const evidenceFile = path.join(evidenceDirectory, "evidence.json");
const evidence: Array<Record<string, unknown>> = [];

async function saveEvidence(): Promise<void> {
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(evidenceFile, `${JSON.stringify({ campaign: "1D", evidence }, null, 2)}\n`, "utf8");
}

async function signIn(page: Page): Promise<void> {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) throw new Error("The official Clerk E2E user email was not provisioned.");
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
}

async function fetchJson(
  page: Page,
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<{ status: number; body: any; attempts: number }> {
  return page.evaluate(async ({ url, init }) => {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        return { status: response.status, body: await response.json(), attempts: attempt };
      } catch (error) {
        lastError = error;
      } finally {
        window.clearTimeout(timeout);
      }
    }
    throw new Error(`Browser API request failed after retry: ${String(lastError)}`);
  }, { url, init });
}

function groupJoinCard(page: Page) {
  return page.getByRole("article").filter({ hasText: "E2E — Place de test locale" });
}

async function dismissCookieConsent(page: Page): Promise<void> {
  const reject = page.getByRole("button", { name: "Tout refuser" });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await reject.isVisible().catch(() => false)) {
      await reject.click({ force: true });
      const decisionPersisted = await page.evaluate(() => {
        try {
          const raw = window.localStorage.getItem("cleanmymap_cookie_consent");
          return raw ? JSON.parse(raw)?.choice === "rejected" : false;
        } catch {
          return false;
        }
      });
      if (decisionPersisted) {
        await expect(reject).toBeHidden();
        return;
      }
    }
    await page.waitForTimeout(250);
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(60000);

test.afterAll(async () => {
  await cleanupGroupJoinFixtureParticipants();
  await saveEvidence();
});

test("late auth, join persistence, idempotence, leave and reread", async ({ page }) => {
  await assertGroupJoinFixtureIsPresent();
  await cleanupGroupJoinFixtureParticipants();
  await page.goto("/sections/rejoindre-un-formulaire");
  await dismissCookieConsent(page);
  const anonymousCard = groupJoinCard(page);
  await expect(anonymousCard).toBeVisible();
  await expect(anonymousCard.getByRole("link", { name: "Se connecter" })).toBeVisible();
  evidence.push({
    surface: "group-join",
    route: "/sections/rejoindre-un-formulaire",
    state: "anonymous",
    PAGE_OK: true,
    INTERACTION_OK: true,
    END_TO_END_OK: false,
    proof: "public fixture card and late-auth CTA visible",
  });

  await page.goto("/");
  await signIn(page);
  await page.goto("/sections/rejoindre-un-formulaire");
  const card = groupJoinCard(page);
  await expect(card.getByRole("button", { name: "Demander à participer" })).toBeVisible();

  const joinResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/actions/group-join",
  );
  await card.getByRole("button", { name: "Demander à participer" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmer cette participation ?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Envoyer la demande" }).click();
  const joinResponse = await joinResponsePromise;
  expect(joinResponse.status()).toBe(200);
  const joinedPayload = await joinResponse.json();
  expect(joinedPayload.participationStatus).toBe("pending");
  expect(joinedPayload.alreadyJoined).toBe(false);

  await page.reload();
  const rereadCard = groupJoinCard(page);
  await expect(rereadCard.getByRole("button", { name: "Annuler ma demande" })).toBeVisible();
  const rereadResult = await fetchJson(
    page,
    `/api/actions/group-join?limit=24&historyLimit=12&actionId=${GROUP_JOIN_FIXTURE_ID}`,
  );
  expect(rereadResult.status).toBe(200);
  const rereadPayload = rereadResult.body;
  const rereadItem = rereadPayload.items.find((item: { id: string }) => item.id === GROUP_JOIN_FIXTURE_ID);
  expect(rereadItem.participationStatus).toBe("pending");
  expect(rereadItem.awaitingApproval).toBe(true);

  const idempotentResult = await fetchJson(page, "/api/actions/group-join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ actionId: GROUP_JOIN_FIXTURE_ID }),
  });
  expect(idempotentResult.status).toBe(200);
  const idempotentPayload = idempotentResult.body;
  // A pending request is not a confirmed membership, so the API keeps
  // alreadyJoined=false while reusing the same pending row without mutation.
  expect(idempotentPayload.alreadyJoined).toBe(false);
  expect(idempotentPayload.participationStatus).toBe("pending");
  expect(idempotentPayload.joinedAt).toBe(rereadItem.joinedAt);

  const leaveResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "DELETE" &&
    new URL(response.url()).pathname === `/api/actions/${GROUP_JOIN_FIXTURE_ID}/group-join`,
  );
  await rereadCard.getByRole("button", { name: "Annuler ma demande" }).click();
  const leaveDialog = page.getByRole("dialog", { name: "Annuler cette demande ?" });
  await expect(leaveDialog).toBeVisible();
  await leaveDialog.getByRole("button", { name: "Annuler la demande" }).click();
  const leaveResponse = await leaveResponsePromise;
  expect(leaveResponse.status()).toBe(200);
  const leavePayload = await leaveResponse.json();
  expect(leavePayload.participationStatus).toBe("cancelled");

  await page.reload();
  const cancelledRereadResult = await fetchJson(
    page,
    `/api/actions/group-join?limit=24&historyLimit=12&actionId=${GROUP_JOIN_FIXTURE_ID}`,
  );
  expect(cancelledRereadResult.status).toBe(200);
  const cancelledPayload = cancelledRereadResult.body;
  const cancelledItem = cancelledPayload.items.find((item: { id: string }) => item.id === GROUP_JOIN_FIXTURE_ID);
  expect(cancelledItem.participationStatus).toBe("cancelled");
  expect(cancelledItem.joined).toBe(false);
  expect(cancelledPayload.history.some((entry: { id: string; participationStatus: string }) =>
    entry.id === GROUP_JOIN_FIXTURE_ID && entry.participationStatus === "cancelled",
  )).toBe(true);

  evidence.push({
    surface: "group-join",
    route: "/sections/rejoindre-un-formulaire",
    state: "authenticated",
    PAGE_OK: true,
    INTERACTION_OK: true,
    END_TO_END_OK: true,
    proof: {
      fixtureId: GROUP_JOIN_FIXTURE_ID,
      firstJoinStatus: joinResponse.status(),
      persistedStatus: rereadItem.participationStatus,
      idempotentAlreadyJoined: idempotentPayload.alreadyJoined,
      idempotentPendingStatus: idempotentPayload.participationStatus,
      leaveStatus: leavePayload.participationStatus,
      rereadAfterLeave: { joined: cancelledItem.joined, historyStatus: "cancelled" },
      cleanup: "afterAll deletes fixture participants locally",
    },
  });
});

test("public action choice, late auth at submit, and draft restoration", async ({ page }) => {
  await page.goto("/actions/new");
  await dismissCookieConsent(page);
  await expect(page.getByRole("heading", { name: "Choisissez votre parcours" })).toBeVisible();
  await page.getByRole("heading", { name: "Déclarer avant l'action" }).click();
  await expect(page.getByRole("heading", { name: "Préparer le formulaire de groupe" })).toBeVisible();

  const title = `E2E local ${Date.now()}`;
  await page.getByLabel("Titre de l'action").fill(title);
  await page.getByLabel("Commune ou zone concernée").fill("Paris E2E");
  await page.getByLabel("Point de rendez-vous précis").fill("Point E2E local");
  await page.getByLabel("Date prévue").fill("2030-01-16");

  const submitResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/actions",
  );
  await page.getByRole("button", { name: "Publier le pré-formulaire" }).click();
  const submitResponse = await submitResponsePromise;
  expect(submitResponse.status()).toBe(401);
  await expect(page.getByText("Se connecter et reprendre")).toBeVisible();
  const signInLink = page.getByRole("link", { name: "Se connecter et reprendre" });
  await expect(signInLink).toHaveAttribute("href", /redirect_url=%2Factions%2Fnew/);

  await page.goto("/");
  await signIn(page);
  await page.goto("/actions/new");
  await page.getByRole("heading", { name: "Déclarer avant l'action" }).click();
  await expect(page.getByRole("heading", { name: "Préparer le formulaire de groupe" })).toBeVisible();
  await expect(page.getByLabel("Titre de l'action")).toHaveValue(title);
  await expect(page.getByLabel("Commune ou zone concernée")).toHaveValue("Paris E2E");
  await expect(page.getByLabel("Point de rendez-vous précis")).toHaveValue("Point E2E local");

  evidence.push({
    surface: "action-new",
    route: "/actions/new",
    state: "anonymous → authenticated",
    PAGE_OK: true,
    INTERACTION_OK: true,
    END_TO_END_OK: true,
    proof: {
      anonymousChoiceVisible: true,
      protectedMutationStatus: submitResponse.status(),
      draftRestoredAfterOfficialClerkSignIn: true,
      restoredFields: ["actionTitle", "communeZoneLabel", "departureLocationLabel"],
    },
  });
});

test("public signalement preparation, late auth and draft restoration", async ({ page }) => {
  await page.goto("/signalement?lat=48.8566&lng=2.3522");
  await dismissCookieConsent(page);
  await expect(page.getByText("Position Certifiée")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pollution constatée" })).toHaveAttribute("aria-pressed", "true");
  const category = page.locator('button[id^="quick-signalement-waste-"]').first();
  await category.click();
  await expect(category).toHaveAttribute("aria-pressed", "true");
  const submitButton = page.getByRole("button", { name: "Signaler la pollution" });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  await expect(page.getByText("Se connecter et reprendre")).toBeVisible();
  await expect(page.locator("body")).toContainText("Vos choix préparés restent sur cet appareil");

  await page.goto("/");
  await signIn(page);
  await page.goto("/signalement?lat=48.8566&lng=2.3522");
  await expect(page.getByText("Position Certifiée")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pollution constatée" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('button[id^="quick-signalement-waste-"]').first()).toHaveAttribute("aria-pressed", "true");

  evidence.push({
    surface: "signalement",
    route: "/signalement?lat=48.8566&lng=2.3522",
    state: "anonymous → authenticated",
    PAGE_OK: true,
    INTERACTION_OK: true,
    END_TO_END_OK: true,
    proof: {
      publicCoordinates: { lat: 48.8566, lng: 2.3522 },
      preparationBeforeAuth: ["recordType", "wasteCategory", "location"],
      draftRestoredAfterOfficialClerkSignIn: true,
      fullSignalementMutation: "not submitted in campaign 1D",
    },
  });
});
