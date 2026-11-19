import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
);
const getSafeAuthSessionMock = vi.hoisted(() => vi.fn());
const loadGateMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  permanentRedirect: redirectMock,
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: getSafeAuthSessionMock,
}));

vi.mock("@/lib/auth/account-completion-gate", () => ({
  loadAccountCompletionGateState: loadGateMock,
}));

vi.mock("@/components/partners/partner-onboarding-form", () => ({
  PartnerOnboardingForm: () => "PartnerOnboardingForm",
}));

vi.mock("@/components/account/account-completion-gate", () => ({
  AccountCompletionGate: ({ children }: { children: unknown }) => children,
}));

import PartnersNetworkPage from "./page";
import PartnersNetworkPepitePage from "./pepite/page";
import PartnerOnboardingPage from "../onboarding/page";

describe("partners network & onboarding pages", () => {
  it("redirects /partners/network and /partners/network/pepite with canonical SEO target", async () => {
    await expect(
      PartnersNetworkPage({ searchParams: Promise.resolve({ tab: "all" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:");

    await expect(
      PartnersNetworkPepitePage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_REDIRECT:");
  });

  it("renders unauthenticated and authenticated states on /partners/onboarding", async () => {
    getSafeAuthSessionMock.mockResolvedValueOnce({
      userId: null,
      clerkReachable: true,
    });
    const anonTree = await PartnerOnboardingPage();
    expect(anonTree).toBeDefined();

    getSafeAuthSessionMock.mockResolvedValueOnce({
      userId: "user-123",
      clerkReachable: true,
    });
    loadGateMock.mockResolvedValueOnce({ completed: true });
    const authedTree = await PartnerOnboardingPage();
    expect(authedTree).toBeDefined();
  });
});
