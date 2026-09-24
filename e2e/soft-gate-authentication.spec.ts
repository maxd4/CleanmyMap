import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";

const gamificationRoute = "/sections/gamification";
const gamificationSignInHref =
  "/sign-in?redirect_url=%2Fsections%2Fgamification";

async function dismissCookies(page: Page): Promise<void> {
  const refuse = page.getByRole("button", { name: "Tout refuser" });
  try {
    await refuse.waitFor({ state: "visible", timeout: 5_000 });
    await refuse.click();
    await expect(refuse).toHaveCount(0);
  } catch {
    // The banner may be absent or already persisted for this browser context.
  }
}

async function openAnonymousGamification(page: Page): Promise<void> {
  await gotoGamification(page);
  await dismissCookies(page);
  await expect(
    page.getByRole("heading", { name: "Connexion requise", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Se connecter", exact: true }).first(),
  ).toHaveAttribute("href", gamificationSignInHref);
}

async function gotoGamification(page: Page): Promise<NonNullable<Awaited<ReturnType<Page["goto"]>>>> {
  let response: Awaited<ReturnType<Page["goto"]>> | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await page.goto(gamificationRoute, {
      waitUntil: "domcontentloaded",
    });
    if (response?.status() === 200) return response;
    await page.waitForTimeout(1_000 * (attempt + 1));
  }
  expect(response?.status()).toBe(200);
  throw new Error("The gamification route did not return a successful response.");
}

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test("gamification soft-gate returns to the canonical route after Clerk sign-in", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });
  await openAnonymousGamification(page);

  await page
    .getByRole("link", { name: "Se connecter", exact: true })
    .first()
    .click();
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}${url.search}`;
    })
    .toBe(gamificationSignInHref);
  await clerk.loaded({ page });

  const signInRoot = page.locator(".cl-signIn-root");
  await signInRoot.waitFor({ state: "visible" });

  const email = process.env.E2E_CLERK_USER_EMAIL?.trim();
  if (!email) {
    throw new Error("E2E_CLERK_USER_EMAIL is required for the Clerk E2E harness.");
  }

  await signInRoot.locator('input[name="identifier"]').fill(email);
  await signInRoot.getByRole("button", { name: "Continuer", exact: true }).click();

  const codeInput = signInRoot
    .locator('input[autocomplete="one-time-code"], input[name="code"]')
    .first();
  await codeInput.waitFor({ state: "visible" });

  const authenticationRedirect = page.waitForURL(
    (url) => `${url.pathname}${url.search}` === gamificationRoute,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  const firstFactorResponse = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "POST" &&
        url.pathname.includes("/v1/client/sign_ins/") &&
        url.pathname.endsWith("/attempt_first_factor")
      );
    },
  );
  await codeInput.pressSequentially("424242");
  const response = await firstFactorResponse;
  expect(response.status()).toBe(200);
  const responseBody = (await response.json()) as {
    response?: { status?: string };
  };
  expect(responseBody.response?.status).toBe("complete");

  await expect
    .poll(() =>
      page.evaluate(() => Boolean(window.Clerk?.session && window.Clerk?.user)),
    )
    .toBe(true);

  await authenticationRedirect;
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}${url.search}`;
    })
    .toBe(gamificationRoute);
  await expect(
    page.getByRole("heading", { name: "Connexion requise", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Écosystème & Gamification",
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(window.Clerk?.user && window.Clerk?.session)),
    )
    .toBe(true);
});

test("gamification soft-gate remains usable on a representative mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAnonymousGamification(page);

  await expect(page.locator("#gamification")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Se connecter", exact: true }).first(),
  ).toHaveAttribute("href", gamificationSignInHref);
});
