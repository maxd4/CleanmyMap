import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  assertGroupJoinFixtureIsPresent,
  GROUP_JOIN_FIXTURE_ID,
} from "./fixtures/group-join-fixture";

const FIXTURE_LABEL = "E2E — Place de test locale";
const SHARE_MESSAGE = "E2E_FIXTURE:action-sharing:manual";

async function signIn(page: Page): Promise<void> {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) throw new Error("The official Clerk E2E user email was not provisioned.");
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
}

async function dismissCookieConsent(page: Page): Promise<void> {
  const reject = page.getByRole("button", { name: "Tout refuser" });
  if (await reject.isVisible().catch(() => false)) {
    await reject.click({ force: true });
    await expect(reject).toBeHidden();
  }
}

test.describe("published future action manual sharing", () => {
  test.setTimeout(60000);

  test("shares externally, then opens and joins through canonical action flow", async ({ page }) => {
    await assertGroupJoinFixtureIsPresent();
    await page.goto("/");
    await signIn(page);
    await page.goto("/sections/rejoindre-un-formulaire");
    await dismissCookieConsent(page);

    const actionCard = page.getByRole("article").filter({ hasText: FIXTURE_LABEL });
    await expect(actionCard).toBeVisible();
    const shareButton = actionCard.getByRole("button", { name: "Partager dans la messagerie" });
    await expect(shareButton).toBeVisible();
    await shareButton.click();

    const dialog = page.getByRole("dialog", { name: "Partager dans la messagerie" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Communauté globale")).toBeVisible();
    await dialog.getByRole("button", { name: "Prévisualiser" }).click();
    await expect(dialog.getByText("La carte sera résolue depuis l’action courante.")).toBeVisible();

    const messageField = dialog.getByRole("textbox", { name: "Message accompagnant le partage" });
    await messageField.fill(SHARE_MESSAGE);
    const responsePromise = page.waitForResponse((response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/api/chat",
    );
    await dialog.getByRole("button", { name: "Confirmer le partage" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.message.action_id).toBe(GROUP_JOIN_FIXTURE_ID);
    expect(responseBody.message.content).toBe(SHARE_MESSAGE);

    await dialog.getByRole("button", { name: "Fermer" }).click();
    await page.goto("/sections/messagerie?tab=discussions&channel=community");
    await expect(page.getByText(SHARE_MESSAGE, { exact: true })).toBeVisible();
    const sharedCard = page.getByRole("article").filter({ hasText: "Action partagée" }).last();
    await expect(sharedCard.getByText(FIXTURE_LABEL)).toBeVisible();
    const openActionLink = sharedCard.getByRole("link", { name: "Ouvrir l’action" });
    await expect(openActionLink).toHaveAttribute(
      "href",
      `/actions/map?actionId=${GROUP_JOIN_FIXTURE_ID}`,
    );
    await openActionLink.click();
    await expect(page).toHaveURL(new RegExp(`/actions/map\\?actionId=${GROUP_JOIN_FIXTURE_ID}$`));

    await page.goto("/sections/messagerie?tab=discussions&channel=community");
    const rereadSharedCard = page.getByRole("article").filter({ hasText: "Action partagée" }).last();
    const joinActionLink = rereadSharedCard.getByRole("link", { name: "Rejoindre l’action" });
    await expect(joinActionLink).toHaveAttribute(
      "href",
      `/sections/rejoindre-un-formulaire?actionId=${GROUP_JOIN_FIXTURE_ID}`,
    );
    await joinActionLink.click();
    await expect(page).toHaveURL(new RegExp(`/sections/rejoindre-un-formulaire\\?actionId=${GROUP_JOIN_FIXTURE_ID}$`));
  });
});
