import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDevAuthBypassRole,
  isDevAuthBypassEnabled,
  isLocalhostHost,
} from "./dev-auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dev auth bypass helpers", () => {
  it("recognizes localhost hosts", () => {
    expect(isLocalhostHost("localhost:3000")).toBe(true);
    expect(isLocalhostHost("127.0.0.1:3000")).toBe(true);
    expect(isLocalhostHost("example.com")).toBe(false);
  });

  it("enables the bypass automatically on localhost during development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(isDevAuthBypassEnabled("localhost:3000")).toBe(true);
    expect(isDevAuthBypassEnabled("example.com")).toBe(false);
  });

  it("allows forcing the bypass from env", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CMM_DEV_AUTH_BYPASS", "1");
    vi.stubEnv("CMM_DEV_AUTH_BYPASS_ROLE", "admin");

    expect(isDevAuthBypassEnabled("example.com")).toBe(true);
    expect(getDevAuthBypassRole()).toBe("admin");
  });

  it("defaults the bypass role to IMU", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(getDevAuthBypassRole()).toBe("imu");
  });
});
