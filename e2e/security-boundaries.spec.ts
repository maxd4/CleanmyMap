import { expect, test } from "@playwright/test";

test.describe("security boundaries without development auth bypass", () => {
  test("admin API is not anonymously successful", async ({ request }) => {
    const response = await request.get("/api/admin/codex-usage");

    expect(response.status()).not.toBe(200);
    expect(response.status()).toBeGreaterThanOrEqual(300);
  });

  test("email test API is not anonymously successful", async ({ request }) => {
    const response = await request.post("/api/email/test", {
      data: {},
    });

    expect(response.status()).not.toBe(200);
    expect(response.status()).toBeGreaterThanOrEqual(300);
  });

  test("legacy send API does not accept an arbitrary test token anonymously", async ({
    request,
  }) => {
    const response = await request.post("/api/send", {
      headers: {
        "x-resend-test-token": "not-the-configured-token",
      },
      data: {
        to: "contact@cleanmymap.fr",
      },
    });

    expect(response.status()).not.toBe(200);
    expect(response.status()).toBeGreaterThanOrEqual(300);
  });
});
