import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import {
  cleanupRouteReferenceActionFixture,
  createRouteReferenceActionFixture,
  seedRouteReferenceCleanupFixture,
} from "./fixtures/route-reference-fixture";

async function signIn(page: import("@playwright/test").Page) {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) throw new Error("The official Clerk E2E user email was not provisioned.");
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
}

test("private route-reference images recover at 390 and 430 pixels", async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  page.on("dialog", (dialog) => dialog.accept());

  for (const width of [390, 430]) {
    const actionId = await createRouteReferenceActionFixture();
    try {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/actions/new?tab=before&section=preparer&subsection=route&actionId=${actionId}`);
      await expect(page.getByRole("heading", { name: "Image de référence privée" })).toBeVisible();
      const fileInput = page.getByLabel("Choisir une image de référence du parcours");
      await fileInput.setInputFiles({
        name: "première-image.png",
        mimeType: "image/png",
        buffer: await (await import("node:fs/promises")).readFile("e2e/fixtures/signalement-upload.png"),
      });
      await expect(page.getByText("première-image.png")).toBeVisible();

      let failCleanup = true;
      await page.route(`**/api/actions/${actionId}/media/intents`, async (route) => {
        if (failCleanup && route.request().method() === "POST" && route.request().postDataJSON()?.operation === "remove_route_reference") {
          failCleanup = false;
          await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Échec Storage simulé." }) });
          return;
        }
        await route.continue();
      });
      await fileInput.setInputFiles({
        name: "remplacement.png",
        mimeType: "image/png",
        buffer: await (await import("node:fs/promises")).readFile("e2e/fixtures/signalement-upload.png"),
      });
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByText("première-image.png")).toBeVisible();
      await expect(page.getByText("remplacement.png")).toBeVisible();

      await page.reload();
      await expect(page.getByText("première-image.png")).toBeVisible();
      const priorCard = page.locator("div.rounded-xl").filter({ hasText: "première-image.png" });
      await priorCard.getByRole("button", { name: "Supprimer" }).click();
      await expect(page.getByText("première-image.png")).toHaveCount(0);
      await expect(page.getByText("remplacement.png")).toBeVisible();

      const cleanupPath = `${actionId}/cleanup-retry-${width}.png`;
      await seedRouteReferenceCleanupFixture(actionId, cleanupPath);
      await page.reload();
      await expect(page.getByText("nettoyage-à-reprendre.png")).toBeVisible();
      await page.getByRole("button", { name: "Réessayer le nettoyage" }).click();
      await expect(page.getByText("nettoyage-à-reprendre.png")).toHaveCount(0);
    } finally {
      await page.unrouteAll();
      await cleanupRouteReferenceActionFixture(actionId);
    }
  }
});
