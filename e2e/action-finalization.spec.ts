import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

const ACTION_ID = "de71d335-77b6-4fc4-99db-0dec7197d090";

function editorAction(actionPhase: "pre_action" | "post_action_draft", finalizationEligible: boolean) {
  return {
    id: ACTION_ID,
    createdAt: "2026-11-01T08:00:00.000Z",
    status: "approved",
    reviewState: "not_required",
    publishedAt: "2026-11-01T09:00:00.000Z",
    actionPhase,
    finalizationEligible,
    preparationData: {},
    createdByClerkId: "user_test_owner",
    actorName: "Compte E2E",
    actionDate: "2026-11-22",
    actionTimezone: "Europe/Paris",
    eventStartAt: "2026-11-22T09:00:00.000Z",
    eventEndAt: "2026-11-22T10:00:00.000Z",
    locationLabel: "Lieu de test E2E",
    latitude: null,
    longitude: null,
    wasteKg: null,
    cigaretteButtsMeasurements: null,
    cigaretteButtsMassKg: null,
    cigaretteButtsVolumeLiters: null,
    cigaretteButtsCondition: null,
    cigaretteButtsKg: null,
    cigaretteButts: null,
    volunteersCount: null,
    collectorsCount: null,
    volunteerParticipation: null,
    durationMinutes: 60,
    eventStartTime: "10:00",
    eventEndTime: "11:00",
    notes: null,
    submissionMode: "complete",
    associationName: "Action spontanée",
    organizerType: "spontaneous",
    organizerId: null,
    organizerName: "Compte E2E",
    actionContext: null,
    actionContextSource: null,
    schoolContextConfirmed: null,
    organizerAccounts: [],
    groupJoinEnabled: true,
    accessMode: "public",
    participantAccounts: [],
    registrationStatuses: [],
    manualInvitationStatuses: [],
    confirmedParticipantAccounts: [],
    placeType: null,
    departureLocationLabel: "Lieu de test E2E",
    arrivalLocationLabel: null,
    routeStyle: null,
    routeAdjustmentMessage: null,
    wasteBreakdown: null,
    wasteMeasurementMethod: null,
    photos: null,
    visionEstimate: null,
    manualDrawing: null,
    geometrySource: null,
    recordType: "action",
  };
}

async function signIn(page: import("@playwright/test").Page) {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) throw new Error("The official Clerk E2E user email was not provisioned.");
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await rejectCookies.isVisible().catch(() => false)) await rejectCookies.click();
}

async function installActionApi(page: import("@playwright/test").Page, phase: "pre_action" | "post_action_draft", eligible: boolean) {
  await page.route(`**/api/actions/${ACTION_ID}`, async (route) => {
    const request = route.request();
    if (request.method() === "PATCH") {
      const body = request.postDataJSON() as { actionPhase?: string };
      expect(body).toEqual({ actionPhase: "post_action_draft" });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", actionId: ACTION_ID, actionPhase: "post_action_draft" }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", action: editorAction(phase, eligible) }),
    });
  });
  await page.route(`**/api/actions/${ACTION_ID}/attendance-registry`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ actionId: ACTION_ID, entries: [], declared: { total: 3, adults: 3, retired: 0, children: 0 }, canMarkPresent: false }),
  }));
  await page.route(`**/api/actions/${ACTION_ID}/role-attestations`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ actionId: ACTION_ID, attestations: [], canManage: true }),
  }));
}

test.describe("protected pre-action to bilan lifecycle", () => {
  test("blocks both deep links before the event end and opens the same action after explicit confirmation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installActionApi(page, "pre_action", false);
    await signIn(page);

    await page.goto(`/actions/new?space=bilan&actionId=${ACTION_ID}`);
    await expect(page.getByText("La pré-action reste ouverte")).toBeVisible();
    await expect(page.getByRole("button", { name: "Compléter le bilan" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Vérifier et transmettre" })).toHaveCount(0);

    await page.goto(`/actions/new?tab=after&actionId=${ACTION_ID}`);
    await expect(page.getByText("La pré-action reste ouverte")).toBeVisible();
    await expect(page.getByRole("button", { name: "Compléter le bilan" })).toHaveCount(0);

    await installActionApi(page, "pre_action", true);
    await page.goto(`/actions/new?space=bilan&actionId=${ACTION_ID}`);
    const completeButton = page.getByRole("button", { name: "Compléter le bilan" });
    await expect(completeButton).toBeVisible();
    await completeButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Vérifier et transmettre" })).toBeVisible();
  });
});
