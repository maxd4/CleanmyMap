import { expect, test, type Page } from "@playwright/test";

test.use({ storageState: "artifacts/playwright/clerk/user.json" });

async function dismissCookies(page: Page): Promise<void> {
  const refuse = page.getByRole("button", { name: "Tout refuser" });
  await refuse.waitFor({ state: "visible", timeout: 3_000 }).catch(() => undefined);
  if (await refuse.isVisible().catch(() => false)) {
    await refuse.click();
    await expect(refuse).toHaveCount(0);
  }
}

test.describe("authenticated mobile header reception", () => {
  test("keeps single-line compact geometry and >=44px touch targets without overflow or collisions under xl (320..1024px)", async ({ page }) => {
    test.setTimeout(120_000);

    for (const width of [320, 360, 390, 430, 768, 1024, 1280] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);

      const accountTrigger = width < 1280
        ? page.getByRole("button", { name: "Menu du compte" })
        : page.getByRole("button", { name: "Menu du profil actif" });
      await expect(accountTrigger).toBeVisible({ timeout: 15_000 });

      const metrics = await page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>('nav[aria-label="Barre de navigation principale"]');
        if (!nav) throw new Error("Missing main navigation bar");
        const visible = (el: HTMLElement) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        const overlaps = (a: DOMRect, b: DOMRect) =>
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        const controls = [...nav.querySelectorAll<HTMLElement>("a, button")].filter(visible);
        const collisions = controls.flatMap((a, i) =>
          controls
            .slice(i + 1)
            .filter((b) => overlaps(a.getBoundingClientRect(), b.getBoundingClientRect()))
            .map((b) => [a.getAttribute("aria-label"), b.getAttribute("aria-label")]),
        );

        return {
          height: nav.getBoundingClientRect().height,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          minTouchW: Math.min(...controls.map((el) => el.getBoundingClientRect().width)),
          minTouchH: Math.min(...controls.map((el) => el.getBoundingClientRect().height)),
          collisions,
        };
      });

      expect(metrics.height, `header height at ${width}px`).toBeLessThanOrEqual(72);
      expect(metrics.scrollWidth, `overflow at ${width}px`).toBeLessThanOrEqual(metrics.clientWidth + 1);
      if (width < 1280) {
        expect(metrics.collisions, `collisions at ${width}px`).toEqual([]);
        expect(metrics.minTouchW, `touch width at ${width}px`).toBeGreaterThanOrEqual(43.5);
        expect(metrics.minTouchH, `touch height at ${width}px`).toBeGreaterThanOrEqual(43.5);
      }
    }
  });

  test("verifies MobileAccountMenu, UserButton, 44px status persistence, role switch + error, keyboard, and 1280px breakpoint", async ({ page }) => {
    test.setTimeout(120_000);

    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
    await dismissCookies(page);

    const accountBtn = page.getByRole("button", { name: "Menu du compte" });
    await expect(accountBtn).toBeVisible({ timeout: 15_000 });

    // Keyboard open & Escape close
    await accountBtn.focus();
    await expect(accountBtn).toBeFocused();
    await page.keyboard.press("Enter");
    const panel = page.locator("#mobile-account-menu-panel");
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();

    // Open via click, verify Clerk UserButton + 44x44 activity status toggle + persistence after reload
    await accountBtn.click();
    await expect(panel).toBeVisible();
    await expect(panel.locator(".cl-userButtonTrigger")).toBeVisible({ timeout: 10_000 });

    const statusBtn = panel.getByRole("button", { name: /Statut : (actif|inactif)/i });
    await expect(statusBtn).toBeVisible();
    const statusBox = await statusBtn.boundingBox();
    expect(statusBox).not.toBeNull();
    expect(statusBox!.width).toBeGreaterThanOrEqual(44);
    expect(statusBox!.height).toBeGreaterThanOrEqual(44);

    const initialPressed = await statusBtn.getAttribute("aria-pressed");
    const expectedPressedAfterToggle = initialPressed === "true" ? "false" : "true";
    const [statusResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/account/activity-status") && res.request().method() === "PATCH"),
      statusBtn.click(),
    ]);
    expect(statusResponse.ok()).toBe(true);
    await expect(statusBtn).toHaveAttribute("aria-pressed", expectedPressedAfterToggle);

    // Reload and verify persisted status
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    await expect(accountBtn).toBeVisible({ timeout: 15_000 });
    await accountBtn.click();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: /Statut : (actif|inactif)/i })).toHaveAttribute(
      "aria-pressed",
      expectedPressedAfterToggle,
    );

    // Positive role switch: require 2xx response and aria-checked="true"
    const roleItems = panel.locator('button[role="menuitemradio"]');
    const roleCount = await roleItems.count();
    expect(roleCount).toBeGreaterThan(1);
    const secondRole = roleItems.nth(1);
    const [roleResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/account/active-profile") && res.request().method() === "POST"),
      secondRole.click(),
    ]);
    expect(roleResponse.ok()).toBe(true);
    await expect(secondRole).toHaveAttribute("aria-checked", "true", { timeout: 10_000 });

    // Role switch refusal: mock 403 and verify error feedback is surfaced
    await page.route("**/api/account/active-profile", (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "Rôle non autorisé pour ce test." }),
      }),
    );
    const inactiveRole = panel.locator('button[role="menuitemradio"][aria-checked="false"]').first();
    await expect(inactiveRole).toBeEnabled({ timeout: 10_000 });
    await inactiveRole.click();
    await expect(panel.locator('[aria-live="polite"]')).toContainText("Rôle non autorisé pour ce test.");
    await page.unroute("**/api/account/active-profile");

    // Cross 1280px (xl) while mobile menu is open -> must close without orphaned portal
    await expect(panel).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(panel).toBeHidden();

    // Open desktop role menu at 1280px and cross back < 1280px -> must close without orphaned portal
    const desktopRoleBtn = page.getByRole("button", { name: "Menu du profil actif" });
    await expect(desktopRoleBtn).toBeVisible();
    await desktopRoleBtn.click();
    const desktopRolePanel = page.locator("#account-role-menu-panel");
    await expect(desktopRolePanel).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(desktopRolePanel).toBeHidden();
  });

  test("applies light/dark themes and all 3 display modes in authenticated mobile header", async ({ page }) => {
    test.setTimeout(120_000);

    await page.setViewportSize({ width: 390, height: 900 });
    for (const theme of ["mixed", "dark"] as const) {
      for (const displayMode of ["exhaustif", "minimaliste", "sobre"] as const) {
        await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
        await page.evaluate(
          ({ t, m }) => {
            localStorage.setItem("cleanmymap.theme", t);
            localStorage.setItem("cleanmymap.display_mode", m);
          },
          { t: theme, m: displayMode },
        );
        await page.reload({ waitUntil: "domcontentloaded" });
        await dismissCookies(page);

        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("html")).toHaveAttribute("data-display-mode", displayMode);
        const accountBtn = page.getByRole("button", { name: "Menu du compte" });
        await expect(accountBtn).toBeVisible({ timeout: 15_000 });
        const navHeight = await page
          .locator('nav[aria-label="Barre de navigation principale"]')
          .evaluate((el) => el.getBoundingClientRect().height);
        expect(navHeight, `height for ${theme}/${displayMode}`).toBeLessThanOrEqual(72);
      }
    }
  });
});
