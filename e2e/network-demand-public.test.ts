import { expect, test, type Page } from "@playwright/test";

type ObservedRequest = {
  method: string;
  url: string;
};

const REQUEST_OBSERVATION_WINDOW_MS = 1_000;

export function localApiRequests(
  requests: readonly ObservedRequest[],
  page: Pick<Page, "url">,
  pathname: string,
  method = "GET",
): ObservedRequest[] {
  const expectedOrigin = new URL(page.url()).origin;

  return requests.filter((request) => {
    try {
      const requestUrl = new URL(request.url);
      return (
        request.method === method &&
        requestUrl.origin === expectedOrigin &&
        requestUrl.pathname === pathname
      );
    } catch {
      return false;
    }
  });
}

async function observeNavigation(page: Page, path: string, expectedPathname?: string) {
  const requests: ObservedRequest[] = [];
  const listener = (request: { method(): string; url(): string }) =>
    requests.push({ method: request.method(), url: request.url() });
  page.on("request", listener);
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load");

  if (expectedPathname) {
    await expect
      .poll(() => localApiRequests(requests, page, expectedPathname).length, {
        timeout: 10_000,
        message: `Expected a GET request for ${expectedPathname}`,
      })
      .toBeGreaterThan(0);
  }

  await page.waitForTimeout(REQUEST_OBSERVATION_WINDOW_MS);
  page.off("request", listener);
  return { requests, response };
}

test("localApiRequests matches the effective origin, method and exact pathname", () => {
  for (const origin of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
    const page = { url: () => `${origin}/sections/community` };
    const requests: ObservedRequest[] = [
      { method: "GET", url: `${origin}/api/community/events?limit=120` },
      { method: "POST", url: `${origin}/api/community/events` },
      { method: "GET", url: `${origin}/api/community/events/123` },
      { method: "GET", url: "http://other-host.test/api/community/events" },
    ];

    expect(localApiRequests(requests, page, "/api/community/events")).toHaveLength(1);
  }
});

test.describe("optional network demand on public surfaces", () => {
  test("partners deep-link does not load community events", async ({ page }) => {
    const { response, requests } = await observeNavigation(page, "/sections/community?tab=partners");

    expect(response?.status()).toBe(200);
    await expect(page.getByText("Rechercher dans le référentiel", { exact: true })).toBeVisible();
    expect(localApiRequests(requests, page, "/api/community/events")).toHaveLength(0);
  });

  test("community loads events once when arriving from partners", async ({ page }) => {
    const requests: ObservedRequest[] = [];
    page.on("request", (request) =>
      requests.push({ method: request.method(), url: request.url() }),
    );

    await page.goto("/sections/community?tab=partners", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.waitForTimeout(REQUEST_OBSERVATION_WINDOW_MS);
    await page.getByRole("link", { name: "Communauté", exact: true }).click();
    await page.waitForURL("**/sections/community**");
    await page.waitForLoadState("load");
    await expect
      .poll(() => localApiRequests(requests, page, "/api/community/events").length, {
        timeout: 10_000,
        message: "Expected a GET request for /api/community/events",
      })
      .toBeGreaterThan(0);
    await page.waitForTimeout(REQUEST_OBSERVATION_WINDOW_MS);

    await expect(page.getByRole("heading", { name: "Communauté", exact: true })).toBeVisible();
    expect(localApiRequests(requests, page, "/api/community/events")).toHaveLength(1);
  });

  test("anonymous recycling and gamification do not request private leaderboard details", async ({ page }) => {
    const recycling = await observeNavigation(page, "/sections/recycling");
    expect(recycling.response?.status()).toBe(200);
    expect(localApiRequests(recycling.requests, page, "/api/recycling/breakdown")).toHaveLength(0);

    const gamification = await observeNavigation(page, "/sections/gamification");
    expect(gamification.response?.status()).toBe(200);
    expect(
      localApiRequests(gamification.requests, page, "/api/gamification/leaderboard/public"),
    ).toHaveLength(0);
  });

  test("the primary public map loads its score references once", async ({ page }) => {
    const { response, requests } = await observeNavigation(
      page,
      "/actions/map",
      "/api/actions/map/pollution-score-references",
    );

    expect(response?.status()).toBe(200);
    await expect(page.getByText("Légende", { exact: true }).first()).toBeVisible();
    expect(
      localApiRequests(requests, page, "/api/actions/map/pollution-score-references"),
    ).toHaveLength(1);
  });
});
