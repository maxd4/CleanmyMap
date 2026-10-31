import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestInstance } from "react-test-renderer";
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

type ButtonProps = { onClick: () => void | Promise<void> };
type InputProps = { onChange: (event: React.ChangeEvent<HTMLInputElement>) => void };
type ImageProps = { loading?: string; priority?: boolean; onLoad?: () => void; onError?: () => void };
type SelectProps = { onChange: (event: { target: { value: string } }) => void; disabled?: boolean };
type TextareaProps = { onChange: (event: { target: { value: string } }) => void };

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

function nodeText(node: ReactTestInstance): string {
  return React.Children.toArray(node.props.children)
    .filter((child): child is string => typeof child === "string")
    .join("");
}

function findButton(renderer: ReturnType<typeof create>, label: string): ReactTestInstance {
  const button = renderer.root.findAll((node) => node.type === "button" && nodeText(node).includes(label))[0];
  expect(button, `button containing ${label}`).toBeTruthy();
  return button!;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function flushEffects(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

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

const observerProjection = (eventName: string, teamName: string) => ({
  projection: {
    event: { id: eventName, name: eventName, eventSlug: null, mode: "mixed", state: "active", startsAt: "2026-06-01T09:00:00.000Z", endsAt: null, publicVisibility: "private", publicResultsVisibility: "hidden" },
    divisions: [{ id: "division-casual", divisionType: "casual", divisionKey: "casual" }, { id: "division-world", divisionType: "world_cup", divisionKey: "world" }],
    teams: [{ id: `team-${eventName}`, divisionId: "division-world", teamNumber: 2, publicName: teamName, compositionState: "locked", submissionStatus: "submitted", submissionVersion: 3, submittedAt: "2026-06-01T10:00:00.000Z", certified: false }],
    participation: { registered: 4, present: 2 },
  },
});

describe("SPOGOMI consumer components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isLoaded = true;
    authState.isSignedIn = false;
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ accessUrl: "https://example.test/team-access", expiresAt: "2026-06-02T12:00:00.000Z" }), { status: 200, headers: { "content-type": "application/json" } })));
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

  it("covers gallery navigation and a share fallback without personal data", async () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiPhotoGallery photos={[photo("one"), photo("two")]} />); });
    const thumbnails = renderer.root.findAll((node) => node.type === "button");
    expect(thumbnails).toHaveLength(2);
    expect(renderer.root.findAll((node) => node.type === "img")).toHaveLength(2);
    await act(async () => { await propsOf<ButtonProps>(thumbnails[0]!).onClick(); });
    expect(renderer.root.findByProps({ role: "dialog" })).toBeTruthy();
    expect(renderer.root.findByProps({ role: "presentation" }).props.className).toContain("z-[60]");
    expect(renderer.root.findAll((node) => node.type === "img")).toHaveLength(3);
    expect(renderer.root.findAll((node) => String(node.props["aria-label"] ?? "").startsWith("Photo suivante"))).toHaveLength(1);
    renderer.unmount();

    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.assign(navigator, { clipboard, share: undefined });
    let shareRenderer!: ReturnType<typeof create>;
    act(() => { shareRenderer = create(<SpogomiVolunteerShareButton eventName="Paris" eventDate="2026-06-01" mission="Arbitrage" eventHref="/spogomi/paris-2026" />); });
    await act(async () => { await propsOf<ButtonProps>(shareRenderer.root.findByType("button")).onClick(); });
    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Contribution SPOGOMI certifiée"));
    expect(clipboard.writeText.mock.calls[0]?.[0]).not.toContain("email");
    shareRenderer.unmount();
  });

  it("keeps image loading, priority and failure states explicit", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiPhotoGallery photos={[photo("one")]} />); });

    const thumbnail = renderer.root.findByType("img");
    expect(propsOf<ImageProps>(thumbnail).loading).toBe("lazy");
    expect(propsOf<ImageProps>(thumbnail).priority).toBe(false);
    expect(renderer.root.findAllByProps({ role: "status" })).toHaveLength(1);

    act(() => { propsOf<ImageProps>(thumbnail).onLoad?.(); });
    expect(renderer.root.findAllByProps({ role: "status" })).toHaveLength(0);

    act(() => { propsOf<ImageProps>(thumbnail).onError?.(); });
    expect(renderer.root.findByProps({ role: "img" }).props["aria-label"]).toContain("Photo indisponible");

    renderer.unmount();
  });

  it("uses eager priority for the active photo and keeps single-photo navigation absent", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiPhotoGallery photos={[photo("one")]} />); });
    const thumbnail = renderer.root.findByType("button");

    act(() => { propsOf<ButtonProps>(thumbnail).onClick(); });
    const activeImage = renderer.root.findAllByType("img").find((node) => propsOf<ImageProps>(node).priority);
    expect(activeImage).toBeTruthy();
    expect(propsOf<ImageProps>(activeImage!).loading).toBe("eager");
    expect(renderer.root.findAll((node) => String(node.props["aria-label"] ?? "").startsWith("Photo précédente"))).toHaveLength(0);
    expect(renderer.root.findAll((node) => String(node.props["aria-label"] ?? "").startsWith("Photo suivante"))).toHaveLength(0);

    renderer.unmount();
  });

  it("keeps the gallery responsive and readable without motion", () => {
    const markup = renderToStaticMarkup(<SpogomiPhotoGallery photos={[photo("one"), photo("two")]} />);

    expect(markup).toContain("sm:grid-cols-3");
    expect(markup).toContain("aspect-[4/3]");
    expect(markup).toContain("motion-reduce");
    expect(markup).toContain("Chargement");
  });

  it("exercises reviewer and team access mutations with scoped endpoints", async () => {
    let reviewer!: ReturnType<typeof create>;
    act(() => { reviewer = create(<SpogomiReviewerManagement eventId="event-1" />); });
    const reviewerInput = reviewer.root.findByType("input");
    act(() => { propsOf<InputProps>(reviewerInput).onChange({ target: { value: "user_referee" } } as React.ChangeEvent<HTMLInputElement>); });
    await act(async () => { await propsOf<ButtonProps>(reviewer.root.findAllByType("button")[0]!).onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-1/reviewers", expect.objectContaining({ method: "POST" }));
    expect(reviewer.root.findByProps({ role: "status" }).props.children).toContain("habilité");
    reviewer.unmount();

    let links!: ReturnType<typeof create>;
    act(() => { links = create(<SpogomiTeamAccessLinks eventId="event-1" teams={[{ id: "team-1", team_number: 1, public_name: "Alpha" }]} />); });
    await act(async () => { await propsOf<ButtonProps>(links.root.findByType("button")).onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-1/teams/team-1/access", expect.objectContaining({ method: "POST" }));
    expect(links.root.findAll((node) => node.type === "textarea" && node.props.value === "https://example.test/team-access")).toHaveLength(1);
    links.unmount();
  });

  it("renders organizer queues with explicit empty states and division-scoped controls", () => {
    expect(renderToStaticMarkup(<SpogomiAdmissionRequestsPanel eventId="event-1" />)).toContain("Aucune demande reçue");
    expect(renderToStaticMarkup(<SpogomiIdentityAssistancePanel eventId="event-1" participants={[]} />)).toContain("Aucune demande reçue");
    expect(renderToStaticMarkup(<SpogomiTeamJoinRequestsPanel eventId="event-1" participants={[]} teams={[]} />)).toContain("Aucune demande de rattachement reçue");
    expect(renderToStaticMarkup(<SpogomiVolunteerAttestationPanel eventId="event-1" divisionId="division-1" participants={[]} />)).toContain("Missions bénévoles certifiées");
    expect(renderToStaticMarkup(<SpogomiObserverCockpitPanel eventId="event-1" view="results" />)).toContain("Chargement des données opérationnelles");
  });

  it("executes identity-assistance decisions, one-time code issuance and private invitation without leaking internal notes", async () => {
    fetchMock.mockReset();
    const pending = {
      id: "request-1",
      providedContext: "Contexte volontaire.",
      status: "pending",
      matchedParticipantId: null,
      verificationNote: null,
      resolutionNote: null,
      handledAt: null,
      createdAt: "2026-06-01T09:00:00.000Z",
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ requests: [pending, { ...pending, id: "request-treated", status: "treated", matchedParticipantId: "participant-1", verificationNote: "Note interne", resolutionNote: "Décision interne" }, { ...pending, id: "request-rejected", status: "rejected" }, { ...pending, id: "request-cancelled", status: "cancelled" }] }))
      .mockResolvedValueOnce(jsonResponse({ status: "ok" }))
      .mockResolvedValueOnce(jsonResponse({ requests: [{ ...pending, status: "treated", matchedParticipantId: "participant-1" }] }))
      .mockResolvedValueOnce(jsonResponse({ code: "SPOGOMI-CODE-ONE-TIME" }))
      .mockResolvedValueOnce(jsonResponse({ url: "/spogomi/assistance?token=opaque" }));

    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiIdentityAssistancePanel eventId="event-1" participants={[{ id: "participant-1", display_name: "Participant historique", external_reference: "ticket-42", account_link_status: "pending", team_id: "team-1" }, { id: "participant-verified", display_name: "Déjà liée", external_reference: null, account_link_status: "verified", team_id: "team-1" }]} />); });
    await act(flushEffects);

    expect(JSON.stringify(renderer.toJSON())).toContain("Traitée — code à remettre manuellement");
    expect(JSON.stringify(renderer.toJSON())).toContain("Refusée");
    expect(JSON.stringify(renderer.toJSON())).toContain("Annulée");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Note interne");

    act(() => { propsOf<SelectProps>(renderer.root.findByType("select")).onChange({ target: { value: "participant-1" } }); });
    const textareas = renderer.root.findAllByType("textarea");
    act(() => { propsOf<TextareaProps>(textareas[0]!).onChange({ target: { value: "Vérification indépendante documentée." } }); });
    const decision = findButton(renderer, "Marquer vérifiée");
    expect(decision.props.disabled).toBe(false);
    await act(async () => { decision.props.onClick(); await flushEffects(); });

    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/spogomi/events/event-1/identity-assistance/requests/request-1");
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toMatchObject({
      status: "treated",
      matchedParticipantId: "participant-1",
      verificationNote: "Vérification indépendante documentée.",
    });

    await act(async () => { findButton(renderer, "Émettre le code à remettre").props.onClick(); await flushEffects(); });
    expect(JSON.stringify(renderer.toJSON())).toContain("SPOGOMI-CODE-ONE-TIME");
    await act(async () => { findButton(renderer, "Créer une invitation privée").props.onClick(); await flushEffects(); });
    expect(JSON.stringify(renderer.toJSON())).toContain("/spogomi/assistance?token=opaque");
    renderer.unmount();
  });

  it("fails closed on an invalid identity-assistance response", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({ requests: [{ id: "malformed" }] }));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiIdentityAssistancePanel eventId="event-1" participants={[]} />); });
    await act(flushEffects);
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toContain("demande invalide");
    renderer.unmount();
  });

  it("clears identity-assistance state and ignores a late decision from the previous event", async () => {
    fetchMock.mockReset();
    let rejectDecision!: (reason: unknown) => void;
    const staleDecision = new Promise<Response>((_resolve, reject) => { rejectDecision = reject; });
    let resolveEventB!: (response: Response) => void;
    const eventBLoad = new Promise<Response>((resolve) => { resolveEventB = resolve; });
    const requestA = { id: "request-a", providedContext: "Contexte privé A", status: "pending", matchedParticipantId: null, verificationNote: null, resolutionNote: null, handledAt: null, createdAt: "2026-06-01T09:00:00.000Z" };
    const requestB = { ...requestA, id: "request-b", providedContext: "Contexte privé B" };
    fetchMock.mockResolvedValueOnce(jsonResponse({ requests: [requestA] })).mockReturnValueOnce(staleDecision);

    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiIdentityAssistancePanel eventId="event-a" participants={[{ id: "participant-a", display_name: "Participant A", external_reference: "ref-a", account_link_status: "pending", team_id: "team-a" }]} />); });
    await act(flushEffects);
    act(() => { propsOf<SelectProps>(renderer.root.findByType("select")).onChange({ target: { value: "participant-a" } }); });
    act(() => { propsOf<TextareaProps>(renderer.root.findAllByType("textarea")[0]!).onChange({ target: { value: "Vérification A hors bande." } }); });
    await act(async () => { findButton(renderer, "Marquer vérifiée").props.onClick(); await Promise.resolve(); });

    fetchMock.mockReturnValueOnce(eventBLoad);
    act(() => { renderer.update(<SpogomiIdentityAssistancePanel eventId="event-b" participants={[{ id: "participant-b", display_name: "Participant B", external_reference: "ref-b", account_link_status: "pending", team_id: "team-b" }]} />); });
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Contexte privé A");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Participant A");

    rejectDecision(new Error("Réponse tardive de A"));
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Réponse tardive de A");

    resolveEventB(jsonResponse({ requests: [requestB] }));
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).toContain("Contexte privé B");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Contexte privé A");
    expect(renderer.root.findByType("select").props.value).toBe("");
    expect(renderer.root.findAllByType("textarea").map((textarea) => textarea.props.value)).toEqual(["", ""]);
    renderer.unmount();
  });

  it("does not reintroduce identity codes or private invitations across A to B to A", async () => {
    fetchMock.mockReset();
    let resolveCode!: (response: Response) => void;
    const staleCode = new Promise<Response>((resolve) => { resolveCode = resolve; });
    let resolveEventB!: (response: Response) => void;
    const eventBLoad = new Promise<Response>((resolve) => { resolveEventB = resolve; });
    let resolveInvitation!: (response: Response) => void;
    const staleInvitation = new Promise<Response>((resolve) => { resolveInvitation = resolve; });
    let resolveEventA2!: (response: Response) => void;
    const eventA2Load = new Promise<Response>((resolve) => { resolveEventA2 = resolve; });
    const treatedA = { id: "request-a", providedContext: "Traité A", status: "treated", matchedParticipantId: "participant-a", verificationNote: null, resolutionNote: null, handledAt: null, createdAt: "2026-06-01T09:00:00.000Z" };
    fetchMock.mockResolvedValueOnce(jsonResponse({ requests: [treatedA] })).mockReturnValueOnce(staleCode);

    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiIdentityAssistancePanel eventId="event-a" participants={[{ id: "participant-a", display_name: "Participant A", external_reference: "ref-a", account_link_status: "pending", team_id: "team-a" }]} />); });
    await act(flushEffects);
    await act(async () => { findButton(renderer, "Émettre le code à remettre").props.onClick(); await Promise.resolve(); });

    fetchMock.mockReturnValueOnce(eventBLoad);
    act(() => { renderer.update(<SpogomiIdentityAssistancePanel eventId="event-b" participants={[]} />); });
    await act(flushEffects);
    resolveCode(jsonResponse({ code: "CODE-A" }));
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("CODE-A");
    resolveEventB(jsonResponse({ requests: [] }));
    await act(flushEffects);

    fetchMock.mockReturnValueOnce(staleInvitation).mockReturnValueOnce(eventA2Load);
    await act(async () => { findButton(renderer, "Créer une invitation privée").props.onClick(); await Promise.resolve(); });
    act(() => { renderer.update(<SpogomiIdentityAssistancePanel eventId="event-a" participants={[]} />); });
    await act(flushEffects);
    resolveInvitation(jsonResponse({ url: "/spogomi/event-b/private-invitation" }));
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("private-invitation");
    resolveEventA2(jsonResponse({ requests: [] }));
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("private-invitation");
    renderer.unmount();
  });

  it("keeps observer projections event-scoped, filterable and free of roster identities", async () => {
    fetchMock.mockReset();
    let resolveFirst!: (response: Response) => void;
    const first = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    fetchMock.mockReturnValueOnce(first).mockResolvedValueOnce(jsonResponse(observerProjection("event-b", "Beta")));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiObserverCockpitPanel eventId="event-a" view="results" />); });
    act(() => { renderer.update(<SpogomiObserverCockpitPanel eventId="event-b" view="results" />); });
    await act(async () => { await flushEffects(); });
    expect(JSON.stringify(renderer.toJSON())).toContain("Beta");
    resolveFirst(jsonResponse(observerProjection("event-a", "Alpha")));
    await act(async () => { await flushEffects(); });
    expect(JSON.stringify(renderer.toJSON())).toContain("Beta");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Alpha");
    expect(JSON.stringify(renderer.toJSON())).not.toMatch(/displayName|clerkId|email|ticket/i);
    act(() => { findButton(renderer, "Toutes les divisions").props.onClick(); });
    expect(findButton(renderer, "World Cup").props["aria-pressed"]).toBe(false);
    act(() => { findButton(renderer, "World Cup").props.onClick(); });
    expect(findButton(renderer, "World Cup").props["aria-pressed"]).toBe(true);
    renderer.unmount();
  });

  it("clears a loaded observer projection before B and ignores late B data during A to B to A", async () => {
    fetchMock.mockReset();
    let resolveEventB!: (response: Response) => void;
    const eventBLoad = new Promise<Response>((resolve) => { resolveEventB = resolve; });
    let resolveEventA2!: (response: Response) => void;
    const eventA2Load = new Promise<Response>((resolve) => { resolveEventA2 = resolve; });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(observerProjection("event-a", "Alpha")))
      .mockReturnValueOnce(eventBLoad)
      .mockReturnValueOnce(eventA2Load);

    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiObserverCockpitPanel eventId="event-a" view="results" />); });
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).toContain("Alpha");

    act(() => { renderer.update(<SpogomiObserverCockpitPanel eventId="event-b" view="results" />); });
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Alpha");
    expect(JSON.stringify(renderer.toJSON())).toContain("Chargement des données opérationnelles");

    act(() => { renderer.update(<SpogomiObserverCockpitPanel eventId="event-a" view="results" />); });
    await act(flushEffects);
    resolveEventB(jsonResponse(observerProjection("event-b", "Beta")));
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Beta");
    resolveEventA2(jsonResponse(observerProjection("event-a", "Alpha 2")));
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).toContain("Alpha 2");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Beta");
    renderer.unmount();
  });

  it("surfaces an invalid observer projection instead of rendering partial private data", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({ projection: { teams: [] } }));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiObserverCockpitPanel eventId="event-1" view="teams" />); });
    await act(flushEffects);
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toContain("réponse invalide");
    renderer.unmount();
  });

  it("requires an unverified roster identity and independent proof before approving a team request", async () => {
    fetchMock.mockReset();
    let resolveDecision!: (response: Response) => void;
    const decision = new Promise<Response>((resolve) => { resolveDecision = resolve; });
    const pending = { id: "join-1", teamId: "team-1", requesterClerkId: "requester-1", status: "pending", matchedParticipantId: null, verificationNote: null, resolutionNote: null, createdAt: "2026-06-01T09:00:00.000Z" };
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ requests: [pending] }))
      .mockReturnValueOnce(decision)
      .mockResolvedValueOnce(jsonResponse({ requests: [{ ...pending, status: "approved", matchedParticipantId: "participant-1" }] }));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiTeamJoinRequestsPanel eventId="event-1" teams={[{ id: "team-1", public_name: "Alpha", team_number: 1 }]} participants={[{ id: "participant-1", display_name: "Historique Alpha", external_reference: "ref-1", account_link_status: "pending", team_id: "team-1" }, { id: "participant-verified", display_name: "Déjà liée", external_reference: "ref-2", account_link_status: "verified", team_id: "team-1" }]} />); });
    await act(flushEffects);

    const select = renderer.root.findByType("select");
    expect(select.findAllByType("option").map((option) => option.props.value)).not.toContain("participant-verified");
    const approval = findButton(renderer, "Accepter et lier l’identité");
    expect(approval.props.disabled).toBe(true);
    act(() => { propsOf<SelectProps>(select).onChange({ target: { value: "participant-1" } }); });
    const verification = renderer.root.findAllByType("textarea")[0]!;
    act(() => { propsOf<TextareaProps>(verification).onChange({ target: { value: "Vérification indépendante documentée." } }); });
    const enabledApproval = findButton(renderer, "Accepter et lier l’identité");
    expect(enabledApproval.props.disabled).toBe(false);
    enabledApproval.props.onClick();
    await act(async () => { await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(enabledApproval.props.disabled).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toMatchObject({ requestId: "join-1", status: "approved", matchedParticipantId: "participant-1" });
    resolveDecision(jsonResponse({ status: "ok" }));
    await act(async () => { await flushEffects(); });
    expect(JSON.stringify(renderer.toJSON())).toContain("Acceptée — identité liée");
    renderer.unmount();
  });

  it("reports team-request loading failures without displaying a private roster", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Accès refusé" }, 403));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiTeamJoinRequestsPanel eventId="event-foreign" teams={[]} participants={[]} />); });
    await act(flushEffects);
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toBe("Accès refusé");
    expect(JSON.stringify(renderer.toJSON())).not.toMatch(/requesterClerkId|external_reference|email/i);
    renderer.unmount();
  });

  it("clears team join selections and ignores a late decision error from the previous event", async () => {
    fetchMock.mockReset();
    let rejectDecision!: (reason: unknown) => void;
    const staleDecision = new Promise<Response>((_resolve, reject) => { rejectDecision = reject; });
    let resolveEventB!: (response: Response) => void;
    const eventBLoad = new Promise<Response>((resolve) => { resolveEventB = resolve; });
    let resolveEventA2!: (response: Response) => void;
    const eventA2Load = new Promise<Response>((resolve) => { resolveEventA2 = resolve; });
    const requestA = { id: "join-a", teamId: "team-a", requesterClerkId: "requester-a", status: "pending", matchedParticipantId: null, verificationNote: null, resolutionNote: null, createdAt: "2026-06-01T09:00:00.000Z" };
    const requestB = { ...requestA, id: "join-b", teamId: "team-b", requesterClerkId: "requester-b" };
    const requestA2 = { ...requestA, id: "join-a2", requesterClerkId: "requester-a2" };
    fetchMock.mockResolvedValueOnce(jsonResponse({ requests: [requestA] })).mockReturnValueOnce(staleDecision);

    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiTeamJoinRequestsPanel eventId="event-a" teams={[{ id: "team-a", public_name: "Alpha", team_number: 1 }]} participants={[{ id: "participant-a", display_name: "Participant A", external_reference: "ref-a", account_link_status: "pending", team_id: "team-a" }]} />); });
    await act(flushEffects);
    act(() => { propsOf<SelectProps>(renderer.root.findByType("select")).onChange({ target: { value: "participant-a" } }); });
    act(() => { propsOf<TextareaProps>(renderer.root.findAllByType("textarea")[0]!).onChange({ target: { value: "Vérification A hors bande." } }); });
    await act(async () => { findButton(renderer, "Accepter et lier l’identité").props.onClick(); await Promise.resolve(); });

    fetchMock.mockReturnValueOnce(eventBLoad);
    act(() => { renderer.update(<SpogomiTeamJoinRequestsPanel eventId="event-b" teams={[{ id: "team-b", public_name: "Beta", team_number: 2 }]} participants={[{ id: "participant-b", display_name: "Participant B", external_reference: "ref-b", account_link_status: "pending", team_id: "team-b" }]} />); });
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("requester-a");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Alpha");

    rejectDecision(new Error("Erreur tardive de A"));
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Erreur tardive de A");
    resolveEventB(jsonResponse({ requests: [requestB] }));
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).toContain("requester-b");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("requester-a");
    expect(renderer.root.findByType("select").props.value).toBe("");
    expect(renderer.root.findAllByType("textarea").map((textarea) => textarea.props.value)).toEqual(["", ""]);

    fetchMock.mockReturnValueOnce(eventA2Load);
    act(() => { renderer.update(<SpogomiTeamJoinRequestsPanel eventId="event-a" teams={[{ id: "team-a", public_name: "Alpha", team_number: 1 }]} participants={[{ id: "participant-a", display_name: "Participant A", external_reference: "ref-a", account_link_status: "pending", team_id: "team-a" }]} />); });
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("requester-b");
    resolveEventA2(jsonResponse({ requests: [requestA2] }));
    await act(flushEffects);
    expect(JSON.stringify(renderer.toJSON())).toContain("requester-a2");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("requester-b");
    renderer.unmount();
  });
});
