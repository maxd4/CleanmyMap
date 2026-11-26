import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function renderServerComponent(element: React.ReactNode): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
    const { pipe } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(stream);
      },
      onError(error) {
        reject(error);
      },
    });
  });
}

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
  getServerLocale: vi.fn(),
  loadProfileProgression: vi.fn(),
  loadProfileBadges: vi.fn(),
  loadProfileReferrals: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/profil/elu",
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: mocks.getCurrentUserIdentity,
}));

vi.mock("@/lib/server-preferences", () => ({
  getServerLocale: mocks.getServerLocale,
}));

vi.mock("./profile-page-data", () => ({
  loadProfileProgression: mocks.loadProfileProgression,
  loadProfileBadges: mocks.loadProfileBadges,
  loadProfileReferrals: mocks.loadProfileReferrals,
}));

vi.mock("@/components/account/profile-detail-navigation", () => ({
  ProfileDetailNavigation: ({ locale }: { locale?: string }) =>
    React.createElement("nav", { "data-testid": "profile-nav", "data-locale": locale ?? "fr" }),
}));

vi.mock("@/components/account/role-profile-switcher", () => ({
  RoleProfileSwitcher: ({ appearance }: { appearance?: string }) =>
    React.createElement("div", { "data-testid": "role-switcher", "data-appearance": appearance ?? "family" }),
}));

vi.mock("@/components/gamification/referral-profile-tabs", () => ({
  ReferralProfileTabs: ({ summary, lineageView }: { summary: unknown; lineageView: unknown }) =>
    React.createElement("div", {
      "data-testid": "referral-tabs",
      "data-has-summary": String(Boolean(summary)),
      "data-has-lineage": String(Boolean(lineageView)),
    }),
}));

vi.mock("@/components/gamification/profile-gamification-summary", () => ({
  ProfileGamificationSummary: () => React.createElement("div", { "data-testid": "gamification-summary" }),
}));

vi.mock("@/components/navigation/role-primary-actions", () => ({
  RolePrimaryActions: () => React.createElement("div", { "data-testid": "role-primary-actions" }),
}));

import ProfilPage from "./page";

describe("ProfilPage conditional loaders and states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerLocale.mockResolvedValue("fr");
    mocks.getSafeAuthSession.mockResolvedValue({ userId: "user-1", clerkReachable: true, state: "authenticated" });
    mocks.getCurrentUserIdentity.mockResolvedValue({ role: "elu", activeRole: "elu" });
    mocks.loadProfileProgression.mockResolvedValue({ summary: {} });
    mocks.loadProfileBadges.mockResolvedValue({ infiniteTotals: null, spogomiCollection: null, spogomiVolunteerSummary: null });
    mocks.loadProfileReferrals.mockResolvedValue({ referralSummary: null, referralLineageView: null, referralLineageError: null });
  });

  it("loads only progression on summary tab", async () => {
    const markup = await renderServerComponent(
      await ProfilPage({
        params: Promise.resolve({ profile: "elu" }),
        searchParams: Promise.resolve({ tab: "summary" }),
      }),
    );

    expect(markup).toContain('data-testid="gamification-summary"');
    expect(mocks.loadProfileProgression).toHaveBeenCalledTimes(1);
    expect(mocks.loadProfileBadges).not.toHaveBeenCalled();
    expect(mocks.loadProfileReferrals).not.toHaveBeenCalled();
  });

  it("renders ReferralProfileTabs when summary is null but lineageView is available", async () => {
    mocks.loadProfileReferrals.mockResolvedValueOnce({
      referralSummary: null,
      referralLineageView: { rootCode: "CMM-1", totalDirectCount: 1 },
      referralLineageError: null,
    });

    const markup = await renderServerComponent(
      await ProfilPage({
        params: Promise.resolve({ profile: "elu" }),
        searchParams: Promise.resolve({ tab: "referrals" }),
      }),
    );

    expect(markup).toContain('data-testid="referral-tabs"');
    expect(markup).toContain('data-has-summary="false"');
    expect(markup).toContain('data-has-lineage="true"');
    expect(mocks.loadProfileReferrals).toHaveBeenCalledTimes(1);
    expect(mocks.loadProfileProgression).not.toHaveBeenCalled();
  });

  it("uses neutral appearance on RoleProfileSwitcher and localizes EN on account tab", async () => {
    mocks.getServerLocale.mockResolvedValueOnce("en");

    const markup = await renderServerComponent(
      await ProfilPage({
        params: Promise.resolve({ profile: "elu" }),
        searchParams: Promise.resolve({ tab: "account" }),
      }),
    );

    expect(markup).toContain('data-appearance="neutral"');
    expect(markup).toContain("Level and active role");
    expect(markup).toContain('data-locale="en"');
  });
});
