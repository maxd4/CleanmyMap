import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDevAuthBypassRole,
  isDevAuthBypassEnabled,
  isLocalhostHost,
  shouldUseDevAuthBypass,
} from "./dev-auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dev auth bypass helpers", () => {
  it("recognizes localhost hosts", () => {
    expect(isLocalhostHost("localhost:3000")).toBe(true);
    expect(isLocalhostHost("127.0.0.1:3000")).toBe(true);
    expect(isLocalhostHost("0.0.0.0:3000")).toBe(false);
    expect(isLocalhostHost("preview.example.com:3000")).toBe(false);
    expect(isLocalhostHost("example.com")).toBe(false);
  });

  it("keeps the human localhost flow on real Clerk by default", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(isDevAuthBypassEnabled("localhost:3000")).toBe(false);
    expect(isDevAuthBypassEnabled("example.com")).toBe(false);
  });

  it("allows forcing the bypass only on strict localhost", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CMM_DEV_AUTH_BYPASS", "1");
    vi.stubEnv("CMM_DEV_AUTH_BYPASS_ROLE", "admin");

    expect(isDevAuthBypassEnabled("localhost:3000")).toBe(true);
    expect(isDevAuthBypassEnabled("example.com")).toBe(false);
    expect(getDevAuthBypassRole()).toBe("admin");
  });

  it("rejects the bypass outside development even on localhost", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CMM_DEV_AUTH_BYPASS", "1");

    expect(isDevAuthBypassEnabled("localhost:3000")).toBe(false);
  });

  it("rejects the bypass on a Vercel production host even if NODE_ENV is misconfigured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CMM_DEV_AUTH_BYPASS", "1");

    expect(isDevAuthBypassEnabled("localhost:3000")).toBe(false);
    expect(
      shouldUseDevAuthBypass({ hostname: "localhost:3000", clerkUserId: null }),
    ).toBe(false);
  });

  it("rejects the synthetic bypass inside GitHub Codespaces", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CODESPACES", "true");
    vi.stubEnv("CMM_DEV_AUTH_BYPASS", "1");

    expect(isDevAuthBypassEnabled("localhost:3000")).toBe(false);
    expect(
      shouldUseDevAuthBypass({ hostname: "localhost:3000", clerkUserId: null }),
    ).toBe(false);
  });

  it("keeps a real Clerk session as the normal Codespaces path", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CODESPACES", "true");
    vi.stubEnv("CMM_DEV_AUTH_BYPASS", "1");

    expect(
      shouldUseDevAuthBypass({
        hostname: "localhost:3000",
        clerkUserId: "user_clerk_codespaces",
      }),
    ).toBe(false);
  });

  it("does not use the automatic localhost bypass when Clerk has a session", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(
      shouldUseDevAuthBypass({
        hostname: "localhost:3000",
        clerkUserId: "user_clerk_123",
      }),
    ).toBe(false);
  });

  it("does not bypass a missing human Clerk session automatically", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(
      shouldUseDevAuthBypass({ hostname: "localhost:3000", clerkUserId: null }),
    ).toBe(false);
  });

  it("keeps an explicitly forced bypass ahead of a Clerk session", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CMM_DEV_AUTH_BYPASS", "1");

    expect(
      shouldUseDevAuthBypass({
        hostname: "localhost:3000",
        clerkUserId: "user_clerk_123",
      }),
    ).toBe(true);
  });

  it.each([
    "benevole",
    "coordinateur",
    "scientifique",
    "entreprise",
    "elu",
    "admin",
    "max",
  ])("accepts the canonical bypass role %s without falling back", (role) => {
    vi.stubEnv("CMM_DEV_AUTH_BYPASS_ROLE", role);

    expect(getDevAuthBypassRole()).toBe(role);
  });

  it("bounds an invalid bypass role to benevole", () => {
    vi.stubEnv("CMM_DEV_AUTH_BYPASS_ROLE", "not-a-granted-role");

    expect(getDevAuthBypassRole()).toBe("benevole");
  });

  it("disables every bypass when the disable flag is set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CMM_DEV_AUTH_BYPASS", "1");
    vi.stubEnv("CMM_DISABLE_DEV_AUTH_BYPASS", "1");

    expect(
      shouldUseDevAuthBypass({
        hostname: "localhost:3000",
        clerkUserId: null,
      }),
    ).toBe(false);
  });

  it("defaults the bypass role to the non-privileged benevole value", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(getDevAuthBypassRole()).toBe("benevole");
  });
});
