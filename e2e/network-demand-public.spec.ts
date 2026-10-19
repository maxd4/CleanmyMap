import { expect, test, type Page } from "@playwright/test";

function localApiRequests(requests: string[], path: string): string[] {
  return requests.filter((url) => url.startsWith("http://localhost:3000/api/") && url.includes(path));
}

async function observeNavigation(page: Page, path: string) {
  const requests: string[] = [];
  const listener = (request: { url(): string }) => requests.push(request.url());
  page.on("request", listener);
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  page.off("request", listener);
  return { requests, response };
}

test.describe("optional network demand on public surfaces", () => {
  test("partners deep-link does not load community events", async ({ page }) => {
    const { response, requests } = await observeNavigation(page, "/sections/community?tab=partners");

    expect(response?.status()).toBe(200);
    await expect(page.getByText("Rechercher dans le référentiel", { exact: true })).toBeVisible();
    expect(localApiRequests(requests, "/api/community/events")).toHaveLength(0);
  });

  test("community loads events once when arriving from partners", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await page.goto("/sections/community?tab=partners", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await page.getByRole("link", { name: "Communauté", exact: true }).click();
    await page.waitForURL("**/sections/community");
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

    await expect(page.getByRole("heading", { name: "Communauté", exact: true })).toBeVisible();
    expect(localApiRequests(requests, "/api/community/events")).toHaveLength(1);
  });

  test("anonymous recycling and gamification do not request private leaderboard details", async ({ page }) => {
    const recycling = await observeNavigation(page, "/sections/recycling");
    expect(recycling.response?.status()).toBe(200);
    expect(localApiRequests(recycling.requests, "/api/recycling/breakdown")).toHaveLength(0);

    const gamification = await observeNavigation(page, "/sections/gamification");
    expect(gamification.response?.status()).toBe(200);
    expect(localApiRequests(gamification.requests, "/api/gamification/leaderboard/public")).toHaveLength(0);
  });

  test("the primary public map loads its score references once", async ({ page }) => {
    const { response, requests } = await observeNavigation(page, "/actions/map");

    expect(response?.status()).toBe(200);
    await expect(page.getByText("Légende", { exact: true }).first()).toBeVisible();
    expect(localApiRequests(requests, "/api/actions/map/pollution-score-references")).toHaveLength(1);
  });
});
