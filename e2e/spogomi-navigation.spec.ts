import { expect, test } from "@playwright/test";

test.describe("SPOGOMI public navigation", () => {
  test("orients each public role without changing permissions", async ({ page }) => {
    const response = await page.goto("/spogomi");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("link", { name: "Voir les compétitions" }).first()).toHaveAttribute("href", "#spogomi-events");
    await expect(page.getByRole("link", { name: "Ouvrir le salon SPOGOMI" }).first()).toHaveAttribute(
      "href",
      "/sections/messagerie?tab=discussions&channel=community&topicId=spogomi",
    );
    await expect(page.getByRole("tab", { name: "Bénévoles" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Rejoindre", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Arbitres & modération" }).click();
    await expect(page.getByText("Certifier", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ouvrir l’espace organisateur" })).toHaveCount(0);
    await expect(page.getByText("Aucun accès arbitre générique", { exact: false })).toBeVisible();

    await page.getByRole("tab", { name: "Organisateurs" }).click();
    await expect(page.getByText("Créer", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ouvrir l’espace organisateur" })).toHaveCount(0);
  });

  test("reaches the public index from future actions", async ({ page }) => {
    const indexResponse = await page.goto("/spogomi");
    expect(indexResponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "SPOGOMI", exact: true })).toBeVisible();

    const joinResponse = await page.goto("/sections/rejoindre-une-action");
    expect(joinResponse?.status()).toBe(200);
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
});
