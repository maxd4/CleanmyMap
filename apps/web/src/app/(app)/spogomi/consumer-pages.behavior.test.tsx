import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadPublishedSpogomiEventBySlug: vi.fn(),
  loadSpogomiTeamResultForm: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  cookies: vi.fn(),
  requireAuthenticatedAccess: vi.fn(),
  redirect: vi.fn((target: string) => { throw new Error(`redirect:${target}`); }),
  notFound: vi.fn(() => { throw new Error("not-found"); }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children) }));
vi.mock("lucide-react", () => ({ ArrowLeft: () => null, ArrowRight: () => null, BookOpen: () => null, CalendarDays: () => null, Globe2: () => null, MapPin: () => null, ShieldCheck: () => null }));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("div", props, children) }));
vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, href, ...props }: React.PropsWithChildren<Record<string, unknown>>) => href ? React.createElement("a", { ...props, href }, children) : React.createElement("button", props, children), CmmButtonGroup: ({ children }: React.PropsWithChildren) => React.createElement("div", null, children) }));
vi.mock("@/components/ui/cmm-disclosure", () => ({ CmmDisclosure: ({ children, summary }: React.PropsWithChildren<{ summary: React.ReactNode }>) => React.createElement("details", null, React.createElement("summary", null, summary), children) }));
vi.mock("@/components/ui/cmm-feedback", () => ({ CmmFeedback: ({ children, title }: React.PropsWithChildren<{ title: string }>) => React.createElement("div", { role: "alert" }, title, children) }));
vi.mock("@/components/ui/cmm-icon", () => ({ CmmIcon: () => null }));
vi.mock("@/components/ui/page-header", () => ({ PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => React.createElement("header", null, title, subtitle) }));
vi.mock("@/lib/ui/page-families", () => ({ resolvePageFamily: () => "spogomi" }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/spogomi/public-service", () => ({ loadPublishedSpogomiEventBySlug: mocks.loadPublishedSpogomiEventBySlug }));
vi.mock("@/lib/spogomi/result-service", () => ({ loadSpogomiTeamResultForm: mocks.loadSpogomiTeamResultForm }));
vi.mock("@/lib/spogomi/team-access", () => ({ SPOGOMI_TEAM_SESSION_COOKIE: "spogomi_team_session" }));
vi.mock("@/components/spogomi/spogomi-public-route-map", () => ({ SpogomiPublicRouteMap: () => React.createElement("div", { "data-testid": "route-map" }) }));
vi.mock("@/components/spogomi/spogomi-identity-link-card", () => ({ SpogomiIdentityLinkCard: () => React.createElement("div", { "data-testid": "identity-link" }) }));
vi.mock("@/components/spogomi/spogomi-volunteer-contributions-card", () => ({ SpogomiVolunteerContributionsCard: () => React.createElement("div", { "data-testid": "contributions" }) }));
vi.mock("@/components/spogomi/spogomi-public-results", () => ({ SpogomiPublicResults: () => React.createElement("div", { "data-testid": "results" }) }));
vi.mock("@/components/spogomi/spogomi-photo-gallery", () => ({ SpogomiPhotoGallery: () => React.createElement("div", { "data-testid": "gallery" }) }));
vi.mock("@/components/spogomi/spogomi-team-join-button", () => ({ SpogomiTeamJoinButton: ({ teamId }: { teamId: string }) => React.createElement("span", { "data-team-id": teamId }) }));
vi.mock("@/components/spogomi/spogomi-admission-request-card", () => ({ SpogomiAdmissionRequestCard: () => React.createElement("div", { "data-testid": "admission" }) }));
vi.mock("@/components/spogomi/spogomi-team-result-form", () => ({ SpogomiTeamResultForm: ({ form }: { form: { team: { publicName: string } } }) => React.createElement("div", { "data-team-form": form.team.publicName }) }));
vi.mock("@/components/spogomi/spogomi-identity-assistance-invitation", () => ({ SpogomiIdentityAssistanceInvitation: ({ eventId, token }: { eventId: string; token: string }) => React.createElement("div", { "data-assistance": `${eventId}:${token}` }) }));

import SpogomiPublicEventPage, { generateMetadata } from "./[eventSlug]/page";
import SpogomiTeamPage from "./[eventSlug]/equipe/page";
import SpogomiIdentityAssistancePage from "./assistance/page";
import SpogomiOrganizerDashboardPage from "../dashboard/spogomi/page";

const event = {
  id: "event-1", name: "SPOGOMI Paris", slug: "paris-2026", lifecycle: "upcoming", mode: "mixed",
  startsAt: "2026-06-01T10:00:00.000Z", endsAt: "2026-06-01T14:00:00.000Z", locationLabel: "Paris",
  actionHref: "/actions/action-1", organizer: { verifiedName: "Association synthétique", territory: "Paris", officialSiteUrl: null, partnerProfileHref: null },
  teams: [{ id: "team-1", divisionId: "division-casual", divisionType: "casual", teamNumber: 1, publicName: "Alpha" }, { id: "team-2", divisionId: "division-world", divisionType: "world_cup", teamNumber: 2, publicName: "Bravo" }],
  divisions: [{ id: "division-casual", type: "casual" }, { id: "division-world", type: "world_cup" }], route: { fileName: "route.gpx", referenceDistanceKm: 2.4, coordinates: [[2.3, 48.8]] }, results: null, gallery: [],
};

describe("SPOGOMI consumer pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockReturnValue({ server: true });
    mocks.cookies.mockResolvedValue({ get: () => undefined });
    mocks.loadPublishedSpogomiEventBySlug.mockResolvedValue(event);
  });

  it("protects metadata and renders a published mixed event without roster PII", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ eventSlug: "missing" }) });
    expect(metadata.title).toBe("SPOGOMI Paris");
    expect(metadata.alternates?.canonical).toBe("/spogomi/paris-2026");
    const markup = renderToStaticMarkup(await SpogomiPublicEventPage({ params: Promise.resolve({ eventSlug: "paris-2026" }) }));
    expect(markup).toContain("Casual &amp; World Cup");
    expect(markup).toContain("Association synthétique");
    expect(markup).toContain("route.gpx");
    expect(markup).toContain("Alpha");
    expect(markup).not.toContain("external_reference");
    expect(markup).not.toContain("requesterClerkId");
  });

  it("fails closed for an unpublished event and differentiates team session absence", async () => {
    mocks.loadPublishedSpogomiEventBySlug.mockResolvedValueOnce(null);
    await expect(SpogomiPublicEventPage({ params: Promise.resolve({ eventSlug: "private" }) })).rejects.toThrow("not-found");
    mocks.loadSpogomiTeamResultForm.mockResolvedValue(null);
    await expect(SpogomiTeamPage({ params: Promise.resolve({ eventSlug: "paris-2026" }) })).rejects.toThrow("redirect:/spogomi/paris-2026");
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "session-1" }) });
    await expect(SpogomiTeamPage({ params: Promise.resolve({ eventSlug: "other" }) })).rejects.toThrow("not-found");
  });

  it("passes private assistance parameters and protects organizer dashboard", async () => {
    const markup = renderToStaticMarkup(await SpogomiIdentityAssistancePage({ searchParams: Promise.resolve({ eventId: "event-1", token: "secret-token" }) }));
    expect(markup).toContain("event-1:secret-token");
    mocks.requireAuthenticatedAccess.mockResolvedValueOnce({ ok: false });
    await expect(SpogomiOrganizerDashboardPage()).rejects.toThrow("redirect:/sign-in?redirect_url=%2Fspogomi%2Fmes-evenements");
    mocks.requireAuthenticatedAccess.mockResolvedValueOnce({ ok: true, userId: "organizer-1" });
    await expect(SpogomiOrganizerDashboardPage()).rejects.toThrow("redirect:/spogomi/mes-evenements");
  });
});
