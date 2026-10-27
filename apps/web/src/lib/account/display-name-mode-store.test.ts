import { beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { getDisplayNameModeCookieOverride } from "./display-name-mode-store";

describe("getDisplayNameModeCookieOverride", () => {
  beforeEach(() => cookiesMock.mockReset());

  it("normalizes the canonical pseudo value", async () => {
    cookiesMock.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: "pseudo" }) });
    await expect(getDisplayNameModeCookieOverride()).resolves.toBe("pseudo");
  });

  it("returns the safe full-name default for missing or unknown values", async () => {
    cookiesMock.mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) });
    await expect(getDisplayNameModeCookieOverride()).resolves.toBeNull();

    cookiesMock.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: "unexpected" }) });
    await expect(getDisplayNameModeCookieOverride()).resolves.toBe("full_name");
  });

});
