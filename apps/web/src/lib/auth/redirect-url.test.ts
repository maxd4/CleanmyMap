import { describe, expect, it } from "vitest";
import {
  buildSignUpCompletionRedirectHref,
  buildSignUpRedirectHref,
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

  it("keeps a referral code on the authentication entry point", () => {
    expect(buildSignInRedirectHref("/actions/new?tab=after", { referralCode: " ABC123 " })).toBe(
      "/sign-in?redirect_url=%2Factions%2Fnew%3Ftab%3Dafter&ref=ABC123",
    );
  });
});

describe("sign-up return contract", () => {
  it("keeps the requested route until mandatory onboarding completes", () => {
    expect(buildSignUpRedirectHref("/spogomi/paris?focus=registration#form")).toBe(
      "/sign-up?redirect_url=%2Fspogomi%2Fparis%3Ffocus%3Dregistration%23form",
    );
    expect(buildSignUpCompletionRedirectHref("/spogomi/paris?focus=registration#form", { referralCode: "INVITE" })).toBe(
      "/onboarding/localisation?next=%2Fspogomi%2Fparis%3Ffocus%3Dregistration%23form&ref=INVITE",
    );
  });

  it("falls back to the onboarding entry without accepting an auth loop", () => {
    expect(buildSignUpCompletionRedirectHref("/sign-in")).toBe("/onboarding/localisation");
    expect(buildSignUpRedirectHref("https://evil.example", { referralCode: "INVITE" })).toBe("/sign-up?ref=INVITE");
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
    expect(resolveSafeAuthRedirect("/sign-in?redirect_url=%2Fprofil")).toBeUndefined();
    expect(resolveSafeAuthRedirect("/sign-up")).toBeUndefined();
  });
});
