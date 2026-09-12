import { describe, expect, it } from "vitest";
import { resolvePublicAppUrl } from "./app-url.mjs";

describe("public app URL resolver", () => {
  it("keeps an explicit URL ahead of every Vercel source", () => {
    expect(
      resolvePublicAppUrl({
        NEXT_PUBLIC_APP_URL: " https://cleanmymap.fr/ ",
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "preview-branch.vercel.app",
        VERCEL_URL: "preview-deployment.vercel.app",
      }),
    ).toBe("https://cleanmymap.fr");
  });

  it("uses the preview branch URL over the deployment URL", () => {
    expect(
      resolvePublicAppUrl({
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "feature-cleanup.vercel.app/",
        VERCEL_URL: "deployment.vercel.app",
      }),
    ).toBe("https://feature-cleanup.vercel.app");
  });

  it("falls back to the preview deployment URL when no branch URL exists", () => {
    expect(
      resolvePublicAppUrl({
        VERCEL_ENV: "preview",
        VERCEL_URL: "deployment.vercel.app/",
      }),
    ).toBe("https://deployment.vercel.app");
  });

  it("keeps an explicit production URL ahead of the Vercel fallback", () => {
    expect(
      resolvePublicAppUrl({
        NEXT_PUBLIC_APP_URL: "https://cleanmymap.fr/",
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "cleanmymap-prod.vercel.app",
      }),
    ).toBe("https://cleanmymap.fr");
  });

  it("uses the Vercel production URL when production has no explicit URL", () => {
    expect(
      resolvePublicAppUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "cleanmymap-prod.vercel.app/",
      }),
    ).toBe("https://cleanmymap-prod.vercel.app");
  });

  it("keeps the localhost fallback outside Vercel", () => {
    expect(resolvePublicAppUrl({ NODE_ENV: "development" })).toBe(
      "http://localhost:3000",
    );
  });
});
