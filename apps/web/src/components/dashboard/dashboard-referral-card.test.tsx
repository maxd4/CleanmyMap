import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReferralSummary } from "@/lib/gamification/referrals/referrals";
import { DashboardReferralCard } from "./dashboard-referral-card";

const referralSummary: ReferralSummary = {
  referralCode: "ABC123",
  inviteUrl: "/sign-up?ref=ABC123",
  invitedUsersCount: 2,
  invitedBy: null,
  badgeUnlocked: true,
  referralAwardedXp: 2,
};

describe("DashboardReferralCard", () => {
  it("renders the available referral summary and profile link", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DashboardReferralCard, {
        locale: "fr",
        summary: referralSummary,
        profile: "benevole",
      }),
    );

    expect(markup).toContain("2");
    expect(markup).toContain("parrainages");
    expect(markup).toContain("Débloqué");
    expect(markup).toContain("Prêt à partager");
    expect(markup).toContain('href="/profil/benevole"');
  });

  it("keeps the unavailable state explicit and localized", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DashboardReferralCard, {
        locale: "en",
        summary: null,
        profile: "benevole",
      }),
    );

    expect(markup).toContain("Persistent counter");
    expect(markup).toContain("Referral data is temporarily unavailable.");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Open badge");
  });
});
