const { test, expect } = require("@playwright/test");

test.describe("CleanMyMap Home Dashboard", () => {
    test.beforeEach(async ({ page }) => {
        // Go to home tab
        await page.goto("/?tab=home");
    });

    test("should display the 'Mission Control' metrics", async ({ page }) => {
        // Check for the rendered metrics
        await expect(page.locator("text=Déchets Retirés")).toBeVisible({ timeout: 15000 });
        await expect(page.locator("text=Mégots Collectés")).toBeVisible();
        await expect(page.locator("text=Bénévoles Mobilisés")).toBeVisible();
        await expect(page.locator("text=Eau Préservée")).toBeVisible();
    });

    test("should display the recent actions list", async ({ page }) => {
        // Check for the subheader
        await expect(page.locator("text=Actions récentes")).toBeVisible();
    });

    test("should display the interactive map", async ({ page }) => {
        // Check for the map container
        await expect(page.locator(".stFolium")).toBeVisible({ timeout: 30000 });
    });
});
