import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isHttpsUrl,
  resolveOnParticipeFundingDestination,
} from "./config";

const ONPARTICIPE_URL = "https://www.onparticipe.fr/c/PUI9aOsy";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("OnParticipe funding configuration", () => {
  it("keeps the external path inactive when its URL is absent", () => {
    expect(resolveOnParticipeFundingDestination(undefined)).toEqual({
      configured: false,
      url: null,
    });
    expect(resolveOnParticipeFundingDestination(" ")).toEqual({
      configured: false,
      url: null,
    });
  });

  it("resolves the verified campaign URL without adding query data", () => {
    expect(resolveOnParticipeFundingDestination(ONPARTICIPE_URL)).toEqual({
      configured: true,
      url: ONPARTICIPE_URL,
    });
  });

  it("accepts only HTTPS URLs", () => {
    expect(isHttpsUrl(ONPARTICIPE_URL)).toBe(true);
    expect(isHttpsUrl("http://www.onparticipe.fr/c/PUI9aOsy")).toBe(false);
    expect(isHttpsUrl("not-a-url")).toBe(false);
  });

  it("keeps only the verified campaign URL in the environment template", () => {
    const template = readFileSync(
      new URL("../../../.env.local.example", import.meta.url),
      "utf8",
    );

    expect(template.match(/^FUNDING_ONPARTICIPE_URL=.*$/m)?.[0]).toBe(
      `FUNDING_ONPARTICIPE_URL=${ONPARTICIPE_URL}`,
    );
  });

  it("accepts the real HTTPS destination through the environment schema", async () => {
    vi.stubEnv("FUNDING_ONPARTICIPE_URL", ONPARTICIPE_URL);

    await expect(import("../env")).resolves.toMatchObject({
      env: { FUNDING_ONPARTICIPE_URL: ONPARTICIPE_URL },
    });
  });

  it("leaves the destination unconfigured when the environment variable is absent", async () => {
    vi.stubEnv("FUNDING_ONPARTICIPE_URL", "");

    await expect(import("../env")).resolves.toMatchObject({
      env: { FUNDING_ONPARTICIPE_URL: undefined },
    });
  });

  it("rejects a non-HTTPS destination through the environment schema", async () => {
    vi.stubEnv("FUNDING_ONPARTICIPE_URL", "http://www.onparticipe.fr/c/PUI9aOsy");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(import("../env")).rejects.toThrow(
      "FUNDING_ONPARTICIPE_URL",
    );
  });
});
