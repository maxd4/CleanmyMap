import { describe, expect, it } from "vitest";
import {
  normalizeSentryEnvironment,
  resolveSentryEnvironment,
  resolveSentryRelease,
} from "./sentry-metadata.mjs";

describe("Sentry metadata", () => {
  it("resolves the release in canonical precedence order", () => {
    expect(
      resolveSentryRelease({
        SENTRY_RELEASE: "  explicit-release  ",
        VERCEL_GIT_COMMIT_SHA: "vercel-sha",
        GIT_COMMIT_SHA: "git-sha",
      }),
    ).toBe("explicit-release");
    expect(
      resolveSentryRelease({
        SENTRY_RELEASE: "",
        VERCEL_GIT_COMMIT_SHA: "vercel-sha",
        GIT_COMMIT_SHA: "git-sha",
      }),
    ).toBe("vercel-sha");
    expect(
      resolveSentryRelease({
        GIT_COMMIT_SHA: "git-sha",
        VERCEL_GIT_COMMIT_REF: "main",
      }),
    ).toBe("git-sha");
    expect(resolveSentryRelease({ VERCEL_GIT_COMMIT_REF: "main" })).toBeNull();
  });

  it("resolves and normalizes the environment in canonical precedence order", () => {
    expect(
      resolveSentryEnvironment({
        SENTRY_ENVIRONMENT: "preview",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toBe("preview");
    expect(resolveSentryEnvironment({ VERCEL_ENV: "production", NODE_ENV: "test" })).toBe(
      "production",
    );
    expect(resolveSentryEnvironment({ NODE_ENV: "test" })).toBe("development");
    expect(normalizeSentryEnvironment("staging")).toBe("development");
  });
});
