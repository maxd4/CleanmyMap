import { describe, expect, it } from "vitest";
import { resolveSafeAuthRedirect } from "./redirect-url";

describe("resolveSafeAuthRedirect", () => {
  it("keeps an internal path and its query/hash", () => {
    expect(resolveSafeAuthRedirect("/sections/route?source=late-auth#draft")).toBe(
      "/sections/route?source=late-auth#draft",
    );
  });

  it("rejects external, protocol-relative, and malformed redirect targets", () => {
    expect(resolveSafeAuthRedirect("https://evil.example")).toBeUndefined();
    expect(resolveSafeAuthRedirect("//evil.example")).toBeUndefined();
    expect(resolveSafeAuthRedirect("/\\evil.example")).toBeUndefined();
    expect(resolveSafeAuthRedirect(undefined)).toBeUndefined();
  });
});
