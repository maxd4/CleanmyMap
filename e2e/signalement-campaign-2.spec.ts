import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cleanupSignalement,
  downloadSignalementObject,
  readSignalement,
  readSignalementMedia,
  SIGNALEMENT_E2E_MEDIA_MARKER,
} from "./fixtures/signalement-fixture";

const evidenceDirectory = path.join(process.cwd(), "artifacts", "playwright", "authenticated-campaign-2");
const evidenceFile = path.join(evidenceDirectory, "evidence.json");
const evidence: Array<Record<string, unknown>> = [];
const createdSignalementIds = new Set<string>();
const ownerId = () => process.env.E2E_CLERK_USER_ID ?? "";

async function saveEvidence(): Promise<void> {
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(evidenceFile, `${JSON.stringify({ campaign: "2", evidence }, null, 2)}\n`, "utf8");
}

async function signIn(page: Page): Promise<void> {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) throw new Error("The official Clerk E2E user email was not provisioned.");
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
}

async function dismissCookieConsent(page: Page): Promise<void> {
  const reject = page.getByRole("button", { name: "Tout refuser" });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await reject.isVisible().catch(() => false)) {
      await reject.click({ force: true });
      await expect(reject).toBeHidden();
      return;
    }
    await page.waitForTimeout(250);
  }
}

async function preparePublicSignalement(page: Page): Promise<void> {
  await page.goto("/signalement?lat=48.8566&lng=2.3522");
  await dismissCookieConsent(page);
  await expect(page.getByText("Position Certifiée")).toBeVisible();
  const category = page.locator('button[id^="quick-signalement-waste-"]').first();
  await category.click();
  await expect(category).toHaveAttribute("aria-pressed", "true");
  const submit = page.getByRole("button", { name: "Signaler la pollution" });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole("link", { name: "Se connecter et reprendre" })).toBeVisible();
}

async function submitSignalementFromUi(page: Page): Promise<{ id: string; status: number }> {
  const submit = page.getByRole("button", { name: "Signaler la pollution" });
  await expect(submit).toBeVisible();
  await expect(submit).toBeEnabled();
  let postCount = 0;
  const onRequest = (request: { method(): string; url(): string }) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/actions") postCount += 1;
  };
  page.on("request", onRequest);
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/actions",
  );
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll("button"))
      .find((candidate) => candidate.textContent?.includes("Signaler la pollution")) as HTMLButtonElement | undefined;
    if (!button) throw new Error("Signalement submit button was not found.");
    button.click();
    button.click();
  });
  const response = await responsePromise;
  const body = (await response.json()) as { id?: string };
  page.off("request", onRequest);
  expect(postCount).toBe(1);
  expect(response.status()).toBe(201);
  expect(typeof body.id).toBe("string");
  return { id: body.id as string, status: response.status() };
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

test.afterAll(async () => {
  const cleaned: Array<Record<string, unknown>> = [];
  for (const id of createdSignalementIds) {
    const result = await cleanupSignalement(id);
    const remaining = await readSignalement(id);
    const remainingMedia = await readSignalementMedia(id);
    expect(remaining).toBeNull();
    expect(remainingMedia).toHaveLength(0);
    cleaned.push({ signalementId: id, ...result, parentReadback: null, mediaReadbackCount: 0 });
  }
  if (cleaned.length > 0) evidence.push({ gate: "teardown", surface: "signalement", CLEANUP: true, proof: cleaned });
  await saveEvidence();
});

test("Gate A: public preparation, authenticated signalement persistence and owner reread", async ({ page }) => {
  await preparePublicSignalement(page);
  await page.goto("/");
  await signIn(page);
  expect(await page.evaluate(() => Boolean(window.Clerk?.session))).toBe(true);

  await page.goto("/signalement?lat=48.8566&lng=2.3522");
  await expect(page.locator('button[id^="quick-signalement-waste-"]').first()).toHaveAttribute("aria-pressed", "true");
  const submitted = await submitSignalementFromUi(page);
  createdSignalementIds.add(submitted.id);
  await expect(page.getByRole("heading", { name: "Pollution signalée" })).toBeVisible({ timeout: 30_000 });

  const persisted = await readSignalement(submitted.id);
  expect(persisted).toMatchObject({
    id: submitted.id,
    created_by_clerk_id: ownerId(),
    user_id: ownerId(),
    spot_type: "spot",
    latitude: 48.8566,
    longitude: 2.3522,
    status: "new",
  });
  expect(persisted?.label).toContain("Signalement Rapide");
  expect(persisted?.notes).toContain("cmm-waste:");

  const ownerReadback = await page.evaluate(async () => {
    const response = await fetch("/api/signalements/me", { headers: { Accept: "application/json" } });
    return { status: response.status, body: await response.json() };
  });
  expect(ownerReadback.status).toBe(200);
  expect(ownerReadback.body.items).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: submitted.id,
      type: "spot",
      label: persisted?.label,
      status: "new",
      latitude: 48.8566,
      longitude: 2.3522,
    }),
  ]));

  await page.reload();
  await page.locator("#mes-observations").scrollIntoViewIfNeeded();
  await expect(page.locator("#mes-observations")).toContainText(persisted?.label ?? "");

  evidence.push({
    gate: "A",
    surface: "signalement",
    route: "/signalement",
    PAGE_OK: true,
    INTERACTION_OK: true,
    END_TO_END_OK: true,
    proof: {
      realClerkSession: true,
      signalementId: submitted.id,
      apiStatus: submitted.status,
      persisted: {
        source: "trash_spotter_spots",
        owner: persisted?.created_by_clerk_id,
        type: persisted?.spot_type,
        status: persisted?.status,
        coordinates: [persisted?.latitude, persisted?.longitude],
        notesContainWasteMarker: persisted?.notes?.includes("cmm-waste:") ?? false,
      },
      ownerEndpointStatus: ownerReadback.status,
      ownerRereadExact: true,
      duplicateSubmitProtection: "UI lock produced exactly one POST /api/actions",
    },
  });
});

test("Gate B: signed upload, controlled failure, retry, Storage object and owner-only reread", async ({ page, browser }) => {
  await page.goto("/");
  await signIn(page);
  await dismissCookieConsent(page);
  await page.goto("/signalement?lat=48.8566&lng=2.3522");
  await expect(page.getByText("Position Certifiée")).toBeVisible();
  const category = page.locator('button[id^="quick-signalement-waste-"]').first();
  await category.click();
  const imagePath = path.resolve("apps/web/public/homepage/schema-global-transparent.png");
  const imageBuffer = await readFile(imagePath);
  await page.locator('input[type="file"]').setInputFiles({
    name: `${SIGNALEMENT_E2E_MEDIA_MARKER}.png`,
    mimeType: "image/png",
    buffer: imageBuffer,
  });
  await expect(page.getByText(/1 photo sélectionnée/)).toBeVisible();

  let signedUploadAttempts = 0;
  await page.route("**/storage/v1/object/upload/sign/**", async (route) => {
    signedUploadAttempts += 1;
    if (signedUploadAttempts === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "E2E controlled upload failure" }),
      });
      return;
    }
    await route.continue();
  });

  const createResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/actions",
  );
  const intentResponses: number[] = [];
  const finalizeResponses: number[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.endsWith("/media/intents")) intentResponses.push(response.status());
    if (url.pathname.endsWith("/finalize")) finalizeResponses.push(response.status());
  });

  await page.getByRole("button", { name: "Signaler la pollution" }).click();
  const createResponse = await createResponsePromise;
  const createBody = (await createResponse.json()) as { id?: string };
  expect(createResponse.status()).toBe(201);
  expect(typeof createBody.id).toBe("string");
  const signalementId = createBody.id as string;
  createdSignalementIds.add(signalementId);

  await expect(page.getByRole("heading", { name: "Signalement créé" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Réessayer les photos" })).toBeVisible({ timeout: 30_000 });
  expect(signedUploadAttempts).toBe(1);

  const pendingMedia = await readSignalementMedia(signalementId);
  expect(pendingMedia).toHaveLength(1);
  expect(pendingMedia[0]?.upload_state).toBe("pending");

  await page.getByRole("button", { name: "Réessayer les photos" }).click();
  await expect(page.getByRole("heading", { name: "Pollution signalée" })).toBeVisible({ timeout: 30_000 });
  expect(signedUploadAttempts).toBe(2);
  expect(intentResponses).toEqual([201, 201]);
  expect(finalizeResponses).toEqual([200]);

  const persisted = await readSignalement(signalementId);
  const media = await readSignalementMedia(signalementId);
  expect(persisted).toMatchObject({
    id: signalementId,
    created_by_clerk_id: ownerId(),
    user_id: ownerId(),
    spot_type: "spot",
    status: "new",
    latitude: 48.8566,
    longitude: 2.3522,
  });
  expect(media).toHaveLength(1);
  const ready = media[0];
  if (!ready) throw new Error("The local signalement media row was not returned.");
  expect(ready).toMatchObject({
    signalement_id: signalementId,
    created_by_clerk_id: ownerId(),
    storage_bucket: "signalement-evidence",
    upload_state: "ready",
    mime_type: "image/jpeg",
  });
  expect(ready.original_name).toContain(SIGNALEMENT_E2E_MEDIA_MARKER);
  expect(ready.storage_path).toMatch(new RegExp(`^${signalementId}/[0-9a-f-]{36}\\.jpg$`));
  expect(ready.size_bytes).toBeGreaterThan(0);
  expect(ready.width).toBeGreaterThan(0);
  expect(ready.height).toBeGreaterThan(0);

  const object = await downloadSignalementObject(ready.storage_path);
  expect(object.bytes.length).toBeGreaterThan(0);
  expect(object.contentType).toBe("image/jpeg");
  expect([...object.bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);

  const ownerMediaReadback = await page.evaluate(async (id) => {
    const response = await fetch(`/api/signalements/${id}/media`, { headers: { Accept: "application/json" } });
    return { status: response.status, body: await response.json() };
  }, signalementId);
  expect(ownerMediaReadback.status).toBe(200);
  expect(ownerMediaReadback.body.items).toEqual([
    expect.objectContaining({
      id: ready.id,
      signalementId,
      storageBucket: "signalement-evidence",
      storagePath: ready.storage_path,
      mimeType: "image/jpeg",
      sizeBytes: ready.size_bytes,
      uploadState: "ready",
    }),
  ]);

  await page.reload();
  await dismissCookieConsent(page);
  const ownerCard = page.locator("#mes-observations article").filter({ hasText: persisted?.label ?? "" }).first();
  await expect(ownerCard).toBeVisible();
  await ownerCard.getByRole("button", { name: "Voir les preuves photo" }).click();
  await expect(ownerCard.getByRole("img", { name: "Preuve photo 1 du signalement" })).toBeVisible();

  const finalizeAgain = await page.evaluate(async ({ signalementId, mediaId }) => {
    const response = await fetch(`/api/signalements/${signalementId}/media/${mediaId}/finalize`, { method: "POST" });
    return { status: response.status, body: await response.json() };
  }, { signalementId, mediaId: ready.id });
  expect(finalizeAgain.status).toBe(200);
  expect(finalizeAgain.body.alreadyReady).toBe(true);

  const anonymousContext = await browser.newContext();
  const anonymousPage = await anonymousContext.newPage();
  await anonymousPage.goto("/");
  const unauthorized = await anonymousPage.evaluate(async (id) => {
    const mediaResponse = await fetch(`/api/signalements/${id}/media`, { headers: { Accept: "application/json" } });
    const observationsResponse = await fetch("/api/signalements/me", { headers: { Accept: "application/json" } });
    return { mediaStatus: mediaResponse.status, observationsStatus: observationsResponse.status };
  }, signalementId);
  await anonymousContext.close();
  expect(unauthorized.mediaStatus).toBe(403);
  expect(unauthorized.observationsStatus).toBe(401);

  evidence.push({
    gate: "B",
    surface: "signalement-media",
    route: "/signalement",
    PAGE_OK: true,
    INTERACTION_OK: true,
    END_TO_END_OK: true,
    proof: {
      signalementId,
      marker: SIGNALEMENT_E2E_MEDIA_MARKER,
      pipeline: ["intent 201", "signed upload first attempt aborted", "retry upload", "finalize 200", "metadata ready", "owner readback 200"],
      signedUploadAttempts,
      intentResponses,
      finalizeResponses,
      storage: {
        bucket: ready.storage_bucket,
        path: ready.storage_path,
        mimeType: object.contentType,
        bytes: object.bytes.length,
        databaseSizeBytes: ready.size_bytes,
        jpegSignature: true,
      },
      idempotentFinalize: finalizeAgain.body.alreadyReady === true,
      authzNegative: unauthorized,
    },
  });
});
