import { describe, expect, it } from "vitest";
import {
  isHttpsUrl,
  resolveOnParticipeFundingDestination,
} from "./config";

const ONPARTICIPE_URL = "https://www.onparticipe.fr/c/PUI9aOsy";

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
});
