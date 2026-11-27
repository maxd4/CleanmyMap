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
  test("keeps single-line compact geometry without overflow or collisions at 320/360/390/430/768px", async ({ page }) => {
    test.setTimeout(120_000);

    for (const width of [320, 360, 390, 430, 768] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/methodologie", { waitUntil: "domcontentloaded" });
      await dismissCookies(page);

      const accountTrigger = width < 768
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
        const controls = [...nav.querySelectorAll<HTMLElement>("a, button")].filter((el) => {
          if (!visible(el)) return false;
          // Exclude the desktop avatar's overlaid 16px status dot from collision/44px checks at 768px.
          const isDesktopOverlayDot = Boolean(
            el.closest("[data-navigation-account-identity]") &&
            el.getAttribute("aria-label")?.startsWith("Statut :"),
          );
          return !isDesktopOverlayDot;
        });
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
      expect(metrics.collisions, `collisions at ${width}px`).toEqual([]);
      if (width < 768) {
        expect(metrics.minTouchW, `touch width at ${width}px`).toBeGreaterThanOrEqual(43.5);
        expect(metrics.minTouchH, `touch height at ${width}px`).toBeGreaterThanOrEqual(43.5);
      }
    }
  });

  test("exercises MobileAccountMenu, UserButton, 44px activity toggle, role switch, keyboard, and 768px breakpoint", async ({ page }) => {
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

    // Open again via click and verify Clerk UserButton + 44x44 activity status button
    await accountBtn.click();
    await expect(panel).toBeVisible();

    const clerkTrigger = panel.locator(".cl-userButtonTrigger");
    await expect(clerkTrigger).toBeVisible({ timeout: 10_000 });

    const statusBtn = panel.getByRole("button", { name: /Statut : (actif|inactif)/i });
    await expect(statusBtn).toBeVisible();
    const statusBox = await statusBtn.boundingBox();
    expect(statusBox).not.toBeNull();
    expect(statusBox!.width).toBeGreaterThanOrEqual(44);
    expect(statusBox!.height).toBeGreaterThanOrEqual(44);

    // Toggle activity status
    const initialPressed = await statusBtn.getAttribute("aria-pressed");
    await statusBtn.click();
    await expect(statusBtn).toHaveAttribute("aria-pressed", initialPressed === "true" ? "false" : "true");

    // Role switch (click an available menuitemradio and verify either active role updates or error is surfaced)
    const roleItems = panel.locator('button[role="menuitemradio"]');
    const roleCount = await roleItems.count();
    expect(roleCount).toBeGreaterThan(0);
    const secondRole = roleCount > 1 ? roleItems.nth(1) : roleItems.first();
    const [roleResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/account/active-profile") && res.request().method() === "POST"),
      secondRole.click(),
    ]);
    if (roleResponse.ok()) {
      await expect(secondRole).toHaveAttribute("aria-checked", "true", { timeout: 10_000 });
    } else {
      await expect(panel.locator('[aria-live="polite"]')).toBeVisible({ timeout: 5_000 });
    }

    // Cross 768px while mobile menu is open -> must close without orphaned portal
    await expect(panel).toBeVisible();
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(panel).toBeHidden();

    // Open desktop role menu at 800px and cross back < 768px -> must close without orphaned portal
    const desktopRoleBtn = page.getByRole("button", { name: "Menu du profil actif" });
    await expect(desktopRoleBtn).toBeVisible();
    await desktopRoleBtn.click();
    const desktopRolePanel = page.locator("#account-role-menu-panel");
    await expect(desktopRolePanel).toBeVisible();
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(desktopRolePanel).toBeHidden();
  });

  test("preserves light/dark themes and all 3 display modes in authenticated mobile header", async ({ page }) => {
    test.setTimeout(120_000);

    await page.setViewportSize({ width: 390, height: 900 });
    for (const theme of ["light", "dark"] as const) {
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
