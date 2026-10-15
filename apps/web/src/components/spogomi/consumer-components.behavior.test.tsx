import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpogomiPublicResults as SpogomiPublicResultsData } from "@/lib/spogomi/results-projection";
import type { SpogomiPublicGalleryPhoto } from "@/lib/spogomi/photo-gallery";

const authState = vi.hoisted(() => ({ isLoaded: true, isSignedIn: false }));
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({ useAuth: () => authState }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children) }));
vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => React.createElement("img", props) }));
vi.mock("next/dynamic", () => ({ default: () => function DynamicComponent(props: Record<string, unknown>) { return React.createElement("div", props); } }));
vi.mock("lucide-react", () => ({
  ArrowRight: () => null, Award: () => null, CalendarDays: () => null, ChevronLeft: () => null,
  ChevronRight: () => null, ClipboardCheck: () => null, Download: () => null, Eye: () => null,
  ExternalLink: () => null, FileText: () => null, Globe2: () => null, Gavel: () => null,
  Leaf: () => null, Link2: () => null, Megaphone: () => null, MapPin: () => null, Plus: () => null,
  Settings2: () => null, ShieldCheck: () => null, SlidersHorizontal: () => null, Trophy: () => null,
  UserRound: () => null, Users: () => null, X: () => null,
}));
vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, href, ...props }: React.PropsWithChildren<Record<string, unknown>>) => href ? React.createElement("a", { ...props, href }, children) : React.createElement("button", props, children) }));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("div", props, children) }));
vi.mock("@/components/ui/cmm-field", () => ({ CmmField: ({ children, label }: React.PropsWithChildren<{ label: string }>) => React.createElement("label", null, label, children), CmmInput: (props: Record<string, unknown>) => React.createElement("input", props), CmmTextarea: (props: Record<string, unknown>) => React.createElement("textarea", props) }));

vi.stubGlobal("fetch", fetchMock);
vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn(), setTimeout, clearTimeout });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

import { SpogomiAdmissionRequestCard } from "./spogomi-admission-request-card";
import { SpogomiAdmissionRequestsPanel } from "./spogomi-admission-requests-panel";
import { SpogomiContextLink } from "./spogomi-context-link";
import { SpogomiCountdown } from "./spogomi-countdown";
import { SpogomiDayReadinessChecklist } from "./spogomi-day-readiness-checklist";
import { SpogomiIdentityAssistanceInvitation } from "./spogomi-identity-assistance-invitation";
import { SpogomiIdentityAssistancePanel } from "./spogomi-identity-assistance-panel";
import { SpogomiObserverCockpitPanel } from "./spogomi-observer-cockpit-panel";
import { SpogomiPhotoGallery } from "./spogomi-photo-gallery";
import { SpogomiPublicResults } from "./spogomi-public-results";
import { SpogomiReviewerManagement } from "./spogomi-reviewer-management";
import { SpogomiTeamAccessLinks } from "./spogomi-team-access-links";
import { SpogomiTeamJoinButton } from "./spogomi-team-join-button";
import { SpogomiTeamJoinRequestsPanel } from "./spogomi-team-join-requests-panel";
import { SpogomiVolunteerAttestationPanel } from "./spogomi-volunteer-attestation-panel";
import { SpogomiVolunteerContributionsCard } from "./spogomi-volunteer-contributions-card";
import { SpogomiVolunteerShareButton } from "./spogomi-volunteer-share-button";

const photo = (id: string): SpogomiPublicGalleryPhoto => ({
  id,
  url: `https://example.test/${id}.jpg`,
  alt: `Photo ${id}`,
  width: 800,
  height: 600,
  caption: id === "one" ? "Collecte" : null,
  credit: id === "one" ? "Photographe synthétique" : null,
  sourceUrl: "https://example.test/source",
  ownerName: "CleanMyMap",
  publishedAt: "2026-06-01T12:00:00.000Z",
});

const publishedResults = {
  visibility: "certified",
  regulationVersion: "rules-v1",
  regulationComplete: true,
  refreshedAt: "2026-06-01T12:00:00.000Z",
  divisions: [{
    id: "division-casual",
    type: "casual",
    regulationVersion: "rules-casual",
    sport: { reason: null, entries: [{ rank: 1, teamNumber: 1, publicName: "Alpha", valueUnit: "points", score: 10, presentParticipants: 3, status: "certified", reason: null }] },
    butts: { reason: null, entries: [{ rank: 1, teamNumber: 1, publicName: "Alpha", valueUnit: "ratio", numerator: 3, denominator: 3, ratio: 1, presentParticipants: 3, status: "provisional", reason: null }] },
  }],
  sport: { reason: "Division non publiée", entries: [] },
  butts: { reason: "Division non publiée", entries: [] },
  environmental: { status: "available", totalWasteMassGrams: 1250, cigaretteButtsMassGrams: 80, cigaretteButtsCount: 8, participantsPresent: 3, projectionVersion: "projection-v1", sourceHash: "hash-v1" },
} as unknown as SpogomiPublicResultsData;

describe("SPOGOMI consumer components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isLoaded = true;
    authState.isSignedIn = false;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } }));
  });

  it("keeps countdown, empty and access states explicit", () => {
    expect(renderToStaticMarkup(<SpogomiCountdown startsAt={null} />)).toContain("Date et heure à confirmer");
    expect(renderToStaticMarkup(<SpogomiCountdown startsAt="not-a-date" />)).toContain("Date indisponible");
    expect(renderToStaticMarkup(<SpogomiCountdown startsAt="2000-01-01T00:00:00.000Z" />)).toContain("Décompte terminé");
    expect(renderToStaticMarkup(<SpogomiCountdown startsAt="2999-01-01T00:00:00.000Z" />)).toContain("aria-live");
    expect(renderToStaticMarkup(<SpogomiContextLink actionId="action-1" />)).toBe("");
    expect(renderToStaticMarkup(<SpogomiPhotoGallery photos={[]} />)).toBe("");
    expect(renderToStaticMarkup(<SpogomiAdmissionRequestCard eventId="event-1" lifecycle="finished" divisions={[]} signInHref="/sign-in" />)).toContain("Retrouver mon équipe");
    expect(renderToStaticMarkup(<SpogomiTeamJoinButton eventId="event-1" teamId="team-1" signInHref="/sign-in" />)).toContain("Se connecter pour rejoindre");
    expect(renderToStaticMarkup(<SpogomiVolunteerContributionsCard eventId="event-1" signInHref="/sign-in" />)).toContain("Se connecter");
    expect(renderToStaticMarkup(<SpogomiIdentityAssistanceInvitation eventId="event-1" token="token-1" signInHref="/sign-in" />)).toContain("Connectez-vous ou créez votre compte");
  });

  it("renders private readiness and public result projections without exposing extra identity data", () => {
    const readiness = renderToStaticMarkup(<SpogomiDayReadinessChecklist data={{
      event: { location_label: "Paris", starts_at: "2026-06-01T10:00:00Z", ends_at: null },
      divisions: [{ id: "division-1", division_type: "world_cup", regulation_status: "complete", regulation_version: "wc-v1", regulation_source_reference: "official" }],
      participants: [{ division_id: "division-1", team_id: null }],
      teams: [],
      route: null,
      categoryRules: [],
      eventAccess: [{ role: "referee", revoked_at: null }, { role: "observer", revoked_at: "2026-01-01T00:00:00Z" }],
    }} />);
    expect(readiness).toContain("World Cup");
    expect(readiness).toContain("places non affectées : 1");
    expect(readiness).toContain("Zone officielle : non renseignée");

    const hidden = renderToStaticMarkup(<SpogomiPublicResults eventSlug="paris-2026" initial={null} />);
    expect(hidden).toContain("restent masqués");
    const published = renderToStaticMarkup(<SpogomiPublicResults eventSlug="paris-2026" initial={publishedResults} />);
    expect(published).toContain("Classement sportif");
    expect(published).toContain("Casual");
    expect(published).toContain("Bilan environnemental global");
    expect(published).not.toContain("requesterClerkId");
  });

  it("covers gallery navigation and a share fallback without personal data", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiPhotoGallery photos={[photo("one"), photo("two")]} />); });
    const thumbnails = renderer.root.findAll((node) => node.type === "button");
    expect(thumbnails).toHaveLength(2);
    act(() => { thumbnails[0]?.props.onClick(); });
    expect(renderer.root.findByProps({ role: "dialog" })).toBeTruthy();
    expect(renderer.root.findAll((node) => node.props["aria-label"] === "Photo suivante")).toHaveLength(1);
    renderer.unmount();

    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.assign(navigator, { clipboard, share: undefined });
    let shareRenderer!: ReturnType<typeof create>;
    act(() => { shareRenderer = create(<SpogomiVolunteerShareButton eventName="Paris" eventDate="2026-06-01" mission="Arbitrage" eventHref="/spogomi/paris-2026" />); });
    act(() => { shareRenderer.root.findByType("button").props.onClick(); });
    return Promise.resolve().then(() => {
      expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Contribution SPOGOMI certifiée"));
      expect(clipboard.writeText.mock.calls[0]?.[0]).not.toContain("email");
      shareRenderer.unmount();
    });
  });

  it("exercises reviewer and team access mutations with scoped endpoints", async () => {
    let reviewer!: ReturnType<typeof create>;
    act(() => { reviewer = create(<SpogomiReviewerManagement eventId="event-1" />); });
    const reviewerInput = reviewer.root.findByType("input");
    act(() => { reviewerInput.props.onChange({ target: { value: "user_referee" } }); });
    await act(async () => { reviewer.root.findAllByType("button")[0]?.props.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-1/reviewers", expect.objectContaining({ method: "POST" }));
    expect(reviewer.root.findByProps({ role: "status" }).props.children).toContain("habilité");
    reviewer.unmount();

    let links!: ReturnType<typeof create>;
    act(() => { links = create(<SpogomiTeamAccessLinks eventId="event-1" teams={[{ id: "team-1", team_number: 1, public_name: "Alpha" }]} />); });
    await act(async () => { links.root.findByType("button").props.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-1/teams/team-1/access", expect.objectContaining({ method: "POST" }));
    expect(links.root.findAll((node) => node.type === "textarea" && node.props.value === "undefined")).toHaveLength(1);
    links.unmount();
  });

  it("renders organizer queues with explicit empty states and division-scoped controls", () => {
    expect(renderToStaticMarkup(<SpogomiAdmissionRequestsPanel eventId="event-1" />)).toContain("Aucune demande reçue");
    expect(renderToStaticMarkup(<SpogomiIdentityAssistancePanel eventId="event-1" participants={[]} />)).toContain("Aucune demande reçue");
    expect(renderToStaticMarkup(<SpogomiTeamJoinRequestsPanel eventId="event-1" participants={[]} teams={[]} />)).toContain("Aucune demande de rattachement reçue");
    expect(renderToStaticMarkup(<SpogomiVolunteerAttestationPanel eventId="event-1" divisionId="division-1" participants={[]} />)).toContain("Missions bénévoles certifiées");
    expect(renderToStaticMarkup(<SpogomiObserverCockpitPanel eventId="event-1" view="results" />)).toContain("Chargement des données opérationnelles");
  });
});
