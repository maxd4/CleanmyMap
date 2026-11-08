import { expect, test, type Page } from "@playwright/test";

async function dismissCookies(page: Page): Promise<void> {
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await rejectCookies.isVisible().catch(() => false)) {
    await rejectCookies.click({ force: true });
    await expect(rejectCookies).toBeHidden();
  }
}

test.describe("SPOGOMI public navigation", () => {
  test("orients each public role without changing permissions", async ({ page }) => {
    const response = await page.goto("/spogomi");
    expect(response?.status()).toBe(200);
    await dismissCookies(page);

    await expect(page.getByRole("link", { name: "Voir les compétitions" }).first()).toHaveAttribute("href", "#spogomi-events");
    await expect(page.getByRole("link", { name: "Ouvrir le salon SPOGOMI" }).first()).toHaveAttribute(
      "href",
      "/sections/messagerie?tab=discussions&channel=community&topicId=spogomi",
    );
    await expect(page.getByRole("tab", { name: "Bénévoles" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Découvrir les compétitions", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ouvrir : Rattacher mon compte par code" })).toHaveAttribute("href", "/spogomi#spogomi-identity");
    await page.getByRole("tab", { name: "Arbitres & modération" }).click();
    await expect(page.getByText("Événements habilités", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ouvrir : Événements habilités" })).toHaveAttribute(
      "href",
      "/sign-in?redirect_url=%2Fspogomi%2Fmes-evenements%3Fparcours%3Dreferees",
    );
    await expect(page.getByText("Aucun accès arbitre générique", { exact: false })).toHaveCount(0);

    await page.getByRole("tab", { name: "Organisateurs" }).click();
    await expect(page.getByText("Créer une compétition", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ouvrir : Créer une compétition" })).toHaveAttribute(
      "href",
      "/sign-in?redirect_url=%2Fspogomi%2Fnouveau",
    );
  });

  test("reaches the public index from future actions", async ({ page }) => {
    const indexResponse = await page.goto("/spogomi");
    expect(indexResponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "SPOGOMI", exact: true })).toBeVisible();

    const joinResponse = await page.goto("/sections/rejoindre-une-action");
    expect(joinResponse?.status()).toBe(200);
    await dismissCookies(page);
    await expect(page.getByText("Compétitions SPOGOMI", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Découvrir SPOGOMI" }).click();
    await expect(page).toHaveURL(/\/spogomi$/);
  });

  test("does not expose private identity fields on the public consultation surface", async ({ page }) => {
    const response = await page.goto("/spogomi");
    expect(response?.status()).toBe(200);
    const publicText = (await page.locator("body").innerText()).toLowerCase();
    expect(publicText).not.toContain("matchedparticipantid");
    expect(publicText).not.toContain("verificationnote");
    expect(publicText).not.toContain("resolutionnote");
  });

  test("keeps private creation and personal-event entry points behind authentication while exposing their intent", async ({ page }) => {
    const creationResponse = await page.goto("/spogomi/nouveau");
    expect(creationResponse?.status()).toBe(200);
    await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fspogomi%2Fnouveau/);

    const eventsResponse = await page.goto("/spogomi/mes-evenements");
    expect(eventsResponse?.status()).toBe(200);
    await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fspogomi%2Fmes-evenements/);

    const organizerIntent = await page.goto("/spogomi/mes-evenements?parcours=organizers&section=teams");
    expect(organizerIntent?.status()).toBe(200);
    await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fspogomi%2Fmes-evenements%3Fparcours%3Dorganizers%26section%3Dteams/);
  });

  test("keeps the private division regulation mutation behind authentication", async ({ page }) => {
    const response = await page.request.patch("/api/spogomi/events/event-that-does-not-exist/divisions/division-1/regulation", {
      data: {
        expectedRevision: 0,
        regulationVersion: "synthetic-v1",
        regulationStatus: "incomplete",
        regulationSourceReference: null,
        teamSize: { casual: { minMembers: null, maxMembers: null } },
        rounding: null,
        penalties: [],
        eligibility: null,
        tiebreakers: [],
        categories: [],
        environmentMappings: [],
      },
    });
    expect(response.status()).toBe(401);
  });

  test("keeps secondary content accessible and compact", async ({ page }) => {
    const response = await page.goto("/spogomi");
    expect(response?.status()).toBe(200);
    const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
    let cookiePromptVisible = false;
    try {
      await rejectCookies.waitFor({ state: "visible", timeout: 5_000 });
      cookiePromptVisible = true;
    } catch {
      cookiePromptVisible = false;
    }
    if (cookiePromptVisible) {
      await rejectCookies.click();
      await expect(rejectCookies).toBeHidden();
    }

    await expect(page.getByRole("heading", { name: "Comprendre SPOGOMI", exact: true })).toBeVisible();
    await expect(page.locator("details")).toHaveCount(6);
    await expect(page.locator("details[open]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "SPOGOMI dans le monde", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Actualités officielles", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Événements internationaux", exact: true })).toBeVisible();

    const casual = page.locator("details").filter({ hasText: "Casual" }).first();
    await casual.locator("summary").press("Enter");
    await expect(casual).toHaveAttribute("open", "");
    await expect(casual).toContainText("taille des équipes");

    const worldCup = page.locator("details").filter({ hasText: "World Cup" }).first();
    await worldCup.locator("summary").focus();
    await worldCup.locator("summary").press("Enter");
    await expect(worldCup).toHaveAttribute("open", "");

    const worldCard = page.locator('[data-cmm-card-tone="indigo"]').filter({ hasText: "SPOGOMI dans le monde" }).first();
    const world = worldCard.locator("details").first();
    await world.locator("summary").click();
    await expect(page.getByRole("link", { name: /Fédération japonaise SPOGOMI/ })).toBeVisible();
    await expect(world.getByText("Vérifié le 2026-10-12", { exact: false }).first()).toBeVisible();

    const eventsCard = page.locator('[data-cmm-card-tone="indigo"]').filter({ hasText: "Événements internationaux" }).first();
    const events = eventsCard.locator("details").first();
    await events.locator("summary").click();
    await expect(page.getByLabel("Année")).toBeVisible();
    await page.getByLabel("Année").selectOption("2027");
    await expect(events).toContainText("SPOGOMI World Cup 2027");
  });

  test("keeps the page header visible above the role navigation at reference widths", async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto("/spogomi");
      expect(response?.status()).toBe(200);
      await dismissCookies(page);

      const pageHeading = page.getByRole("heading", { name: "SPOGOMI", exact: true });
      const orientation = page.locator('section[aria-labelledby="spogomi-orientation-title"]');
      await expect(pageHeading).toBeVisible();
      await expect(orientation).toBeVisible();
      const [headingBox, orientationBox] = await Promise.all([pageHeading.boundingBox(), orientation.boundingBox()]);
      expect(headingBox).not.toBeNull();
      expect(orientationBox).not.toBeNull();
      expect(headingBox!.y).toBeGreaterThanOrEqual(0);
      expect(headingBox!.y + headingBox!.height).toBeLessThanOrEqual(orientationBox!.y + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }
  });
});
