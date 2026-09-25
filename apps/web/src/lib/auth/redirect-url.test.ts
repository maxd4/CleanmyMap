import { describe, expect, it } from "vitest";
import {
  buildSignInRedirectHref,
  resolveSafeAuthRedirect,
} from "./redirect-url";

describe("buildSignInRedirectHref", () => {
  it("encodes an internal route with its query and hash as the sign-in return target", () => {
    expect(
      buildSignInRedirectHref("/actions/new?panel=itineraire&source=late-auth#draft"),
    ).toBe(
      "/sign-in?redirect_url=%2Factions%2Fnew%3Fpanel%3Ditineraire%26source%3Dlate-auth%23draft",
    );
  });

  it("does not include an unsafe redirect target", () => {
    expect(buildSignInRedirectHref("https://evil.example")).toBe("/sign-in");
    expect(buildSignInRedirectHref("//evil.example")).toBe("/sign-in");
  });
});

describe("resolveSafeAuthRedirect", () => {
  it("keeps an internal path and its query/hash", () => {
    expect(resolveSafeAuthRedirect("/actions/new?panel=itineraire&source=late-auth#draft")).toBe(
      "/actions/new?panel=itineraire&source=late-auth#draft",
    );
  });

  it("rejects external, protocol-relative, and malformed redirect targets", () => {
    expect(resolveSafeAuthRedirect("https://evil.example")).toBeUndefined();
    expect(resolveSafeAuthRedirect("//evil.example")).toBeUndefined();
    expect(resolveSafeAuthRedirect("/\\evil.example")).toBeUndefined();
    expect(resolveSafeAuthRedirect(undefined)).toBeUndefined();
  });
});
