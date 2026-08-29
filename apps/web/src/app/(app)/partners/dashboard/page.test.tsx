import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  loadAccountCompletionGateState: vi.fn(),
  getCurrentUserRoleLabel: vi.fn(),
  countPartnerOnboardingRequests: vi.fn(),
  listPublishedPartnerAnnuaireEntries: vi.fn(),
  canUseSupabaseServerPersistence: vi.fn(),
}));

vi.mock("@/components/sections/rubriques/annuaire/seed-index", () => {
  throw new Error("Partners dashboard must not import public annuaire seeds");
});

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

vi.mock("@/lib/auth/account-completion-gate", () => ({
  loadAccountCompletionGateState: mocks.loadAccountCompletionGateState,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserRoleLabel: mocks.getCurrentUserRoleLabel,
}));

vi.mock("@/lib/partners/onboarding-requests-store", () => ({
  countPartnerOnboardingRequests: mocks.countPartnerOnboardingRequests,
}));

vi.mock("@/lib/partners/published-annuaire-entries-store", () => ({
  listPublishedPartnerAnnuaireEntries: mocks.listPublishedPartnerAnnuaireEntries,
}));

vi.mock("@/lib/persistence/runtime-store", () => ({
  canUseSupabaseServerPersistence: mocks.canUseSupabaseServerPersistence,
}));

vi.mock("@/components/partners/published-annuaire-review-panel", () => ({
  PublishedAnnuaireReviewPanel: ({ items }: { items: Array<{ name: string }> }) =>
    React.createElement("div", { "data-testid": "review-panel" }, items.map((item) => item.name).join(",")),
}));

vi.mock("@/components/ui/clerk-required-gate", () => ({
  ClerkRequiredGate: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

vi.mock("@/components/account/account-completion-gate", () => ({
  AccountCompletionGate: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title, subtitle, children }: { title: React.ReactNode; subtitle: React.ReactNode; children?: React.ReactNode }) =>
    React.createElement("header", null, title, subtitle, children),
}));

vi.mock("@/lib/ui/page-families", () => ({
  resolvePageFamily: vi.fn(() => ({ id: "network" })),
}));

vi.mock("@/lib/ui/block-accents", () => ({
  getBlockClasses: vi.fn(() => ({ surface: "surface", shadow: "shadow" })),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  AlertCircle: () => React.createElement("span"),
  ClipboardCheck: () => React.createElement("span"),
  MapPin: () => React.createElement("span"),
  Network: () => React.createElement("span"),
  ShieldCheck: () => React.createElement("span"),
  Users: () => React.createElement("span"),
}));

import PartnersDashboardPage from "./page";

const ACCEPTED_ENTRY = {
  name: "Structure persistée",
  publicationStatus: "accepted",
  qualificationStatus: "partenaire_actif",
  verificationStatus: "verifie",
  recentActivityAt: "2026-08-25T10:00:00.000Z",
  coveredArrondissements: [10, 11],
};

describe("/partners/dashboard persisted governance contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSafeAuthSession.mockResolvedValue({ userId: "admin-1", clerkReachable: true });
    mocks.loadAccountCompletionGateState.mockResolvedValue({ requirement: { requiresSetup: false } });
    mocks.getCurrentUserRoleLabel.mockResolvedValue("admin");
    mocks.canUseSupabaseServerPersistence.mockReturnValue(true);
    mocks.countPartnerOnboardingRequests.mockResolvedValue(7);
  });

  it("uses accepted persisted entries only and cannot load public seeds", async () => {
    mocks.listPublishedPartnerAnnuaireEntries.mockResolvedValue([ACCEPTED_ENTRY]);

    const markup = renderToStaticMarkup(await PartnersDashboardPage());

    expect(markup).toMatch(/<p[^>]*>1<\/p>[\s\S]*Fiches publiées/);
    expect(markup).toMatch(/<p[^>]*>1<\/p>[\s\S]*Partenaires actifs/);
    expect(markup).toMatch(/<p[^>]*>2<\/p>[\s\S]*Zones couvertes/);
    expect(markup).toMatch(/<p[^>]*>0<\/p>[\s\S]*Fiches à revoir/);
    expect(markup).toContain("7");
  });

  it("keeps onboarding count independent and renders a real empty state", async () => {
    mocks.listPublishedPartnerAnnuaireEntries.mockResolvedValue([]);
    mocks.countPartnerOnboardingRequests.mockResolvedValue(4);

    const markup = renderToStaticMarkup(await PartnersDashboardPage());

    expect(markup).toContain("Aucune fiche partenaire persistée n’est disponible");
    expect(markup).toMatch(/<p[^>]*>0<\/p>[\s\S]*Fiches publiées/);
    expect(markup).toMatch(/<p[^>]*>0<\/p>[\s\S]*Partenaires actifs/);
    expect(markup).toMatch(/<p[^>]*>0<\/p>[\s\S]*Zones couvertes/);
    expect(markup).toContain("4");
  });

  it("does not present failed persisted reads as zero governance data", async () => {
    mocks.listPublishedPartnerAnnuaireEntries.mockRejectedValue(new Error("store unavailable"));

    const markup = renderToStaticMarkup(await PartnersDashboardPage());

    expect(markup).toContain("Fiches partenaires indisponibles");
    expect(markup).toMatch(/<p[^>]*>n\/a<\/p>[\s\S]*Fiches publiées/);
  });
});
