import { expect, test } from "@playwright/test";

test.describe("SPOGOMI public navigation", () => {
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
});
