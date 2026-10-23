import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ isLoaded: true, isSignedIn: false }));
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({ useAuth: () => authState }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children) }));
vi.mock("next/dynamic", () => ({ default: () => function DynamicComponent() { return React.createElement("div", { "data-dynamic": true }); } }));
vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => React.createElement("img", props) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("lucide-react", () => ({ Link2: () => null, Users: () => null }));
vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, href, ...props }: React.PropsWithChildren<Record<string, unknown>>) => href ? React.createElement("a", { ...props, href }, children) : React.createElement("button", props, children) }));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("div", props, children) }));
vi.mock("@/components/ui/cmm-field", () => ({ CmmField: ({ children, label }: React.PropsWithChildren<{ label: string }>) => React.createElement("label", null, label, children), CmmInput: (props: Record<string, unknown>) => React.createElement("input", props), CmmTextarea: (props: Record<string, unknown>) => React.createElement("textarea", props) }));
vi.mock("@/components/ui/page-header", () => ({ PageHeader: ({ title }: { title: string }) => React.createElement("h1", null, title) }));
vi.mock("@/lib/spogomi/collection", () => ({ getSpogomiBadgePresentation: () => ({ label: "Badge", roleOrRank: "Participant" }) }));
vi.mock("@/lib/spogomi/preparation", () => ({ validateProposedTeamFormation: () => ({ valid: true, errors: [] }) }));
vi.mock("@/lib/spogomi/types", () => ({ spogomiDivisionTypesForMode: () => ["casual", "world_cup"], spogomiModeLabel: (mode: string) => mode }));
vi.stubGlobal("fetch", fetchMock);
vi.stubGlobal("window", { setTimeout, clearTimeout, addEventListener: vi.fn(), removeEventListener: vi.fn() });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

import { SpogomiAttendancePanel } from "./spogomi-attendance-panel";
import { SpogomiFieldOperationsPanel } from "./spogomi-field-operations-panel";
import { SpogomiIdentityLinkCard } from "./spogomi-identity-link-card";
import { SpogomiResultReviewPanel } from "./spogomi-result-review-panel";
import { SpogomiTeamAccessLinks } from "./spogomi-team-access-links";
import { SpogomiTeamResultForm } from "./spogomi-team-result-form";
import { SpogomiConsolidationPanel } from "./spogomi-consolidation-panel";

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const settle = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve(); }); };
const attendanceRow = (attendanceStatus: "unknown" | "present" | "absent", updatedAt = "revision-1") => ({ id: "participant-1", divisionId: "division-1", displayName: "Participant synthétique", externalReference: "P-1", place: 1, team: null, attendanceStatus, registrationStatus: "registered", updatedAt });
const attendanceMutation = (status: "unknown" | "present" | "absent", previousStatus = "unknown", updatedAt = status === previousStatus ? "revision-1" : "revision-2") => ({ attendance: { changed: status !== previousStatus, eventId: "event-1", divisionId: "division-1", participantId: "participant-1", previousStatus, attendanceStatus: status, updatedAt } });

const dashboard = {
  divisions: [{ id: "division-1", division_type: "casual", regulation_version: "rules-v1" }],
  teams: [{ id: "team-1", division_id: "division-1", team_number: 1, public_name: "Alpha" }],
  categories: [{ id: "category-1", division_id: "division-1", label: "Plastique", measurement_kind: "mass", unit: "g" }],
  operations: [], returns: [], incidents: [], measurements: [],
};

type ButtonProps = { children?: React.ReactNode; disabled?: boolean; onClick: () => unknown };
type TextareaProps = { value?: string };
type LinkProps = { href?: string };
type StatusProps = { children?: React.ReactNode };
type FetchCall = [RequestInfo | URL, RequestInit?];

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

function buttonProps(node: ReactTestInstance): ButtonProps {
  return propsOf<ButtonProps>(node);
}

function fetchCalls(): FetchCall[] {
  return fetchMock.mock.calls as unknown as FetchCall[];
}

function jsonBody(call: FetchCall | undefined): Record<string, unknown> {
  return JSON.parse(String(call?.[1]?.body ?? "")) as Record<string, unknown>;
}

describe("SPOGOMI deep consumer states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isLoaded = true;
    authState.isSignedIn = false;
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/field-operations")) return Promise.resolve(response(dashboard));
      if (url.includes("/attendance")) return Promise.resolve(response({ participants: [], total: 0 }));
      if (url.includes("/results")) return Promise.resolve(response({ results: [] }));
      return Promise.resolve(response({}));
    });
  });

  it("loads field operations and preserves capability-scoped mutation payloads", async () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiFieldOperationsPanel eventId="event-1" capabilities={["timing", "arrival", "measurement_entry", "arbitration"]} />); });
    await settle();
    expect(propsOf<StatusProps>(renderer.root.findByType("h2")).children).toContain("Terrain");
    expect(renderer.root.findAllByType("h3").map((node) => propsOf<StatusProps>(node).children)).toContain("Phase officielle");
    const phaseButton = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "collection");
    expect(phaseButton).toBeTruthy();
    await act(async () => { phaseButton?.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-1/field-operations", expect.objectContaining({ method: "POST" }));
    const mutationCall = fetchCalls().reverse().find((call) => call[1]?.method === "POST");
    const payload = jsonBody(mutationCall);
    expect(payload).toEqual(expect.objectContaining({ action: "phase", divisionId: "division-1", phase: "collection" }));
    renderer.unmount();
  });

  it("keeps field-operation controls busy until a mutation settles", async () => {
    let resolvePost!: (value: Response) => void;
    fetchMock.mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") return new Promise<Response>((resolve) => { resolvePost = resolve; });
      return Promise.resolve(response(dashboard));
    });
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiFieldOperationsPanel eventId="event-1" capabilities={["timing"]} />); });
    await settle();
    const phaseButton = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "collection");
    expect(phaseButton?.disabled).toBe(false);
    await act(async () => { phaseButton?.onClick(); await Promise.resolve(); });
    expect(renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "collection")?.disabled).toBe(true);
    resolvePost(response({}));
    await settle();
    expect(renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "collection")?.disabled).toBe(false);
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "status" })).children).toBe("Décision enregistrée avec sa provenance.");
    renderer.unmount();
  });

  it("surfaces a mutation rejection and releases the busy state", async () => {
    fetchMock.mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") return Promise.reject(new Error("Échec réseau synthétique"));
      return Promise.resolve(response(dashboard));
    });
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiFieldOperationsPanel eventId="event-1" capabilities={["timing"]} />); });
    await settle();
    const phaseButton = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "collection");
    await act(async () => { phaseButton?.onClick(); await Promise.resolve(); });
    await settle();
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "status" })).children).toBe("Échec réseau synthétique");
    expect(renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "collection")?.disabled).toBe(false);
    renderer.unmount();
  });

  it("loads the paginated attendance projection and displays its total", async () => {
    fetchMock.mockResolvedValueOnce(response({ participants: [attendanceRow("unknown")], total: 1 }));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiAttendancePanel eventId="event-1" divisionId="division-1" />); });
    await settle();
    expect(propsOf<StatusProps>(renderer.root.findByType("h2")).children).toBe("Accueil et présences");
    expect(renderer.root.findAllByType("span").map((node) => propsOf<StatusProps>(node).children)).toContainEqual([1, " participant(s)"]);
    expect(renderer.root.findAllByType("span").map((node) => propsOf<StatusProps>(node).children)).toContain("unknown");
    renderer.unmount();
  });

  it.each([
    ["unknown", "present"],
    ["present", "absent"],
    ["absent", "unknown"],
  ] as const)("confirms a successful %s -> %s attendance mutation and refreshes the projection", async (previousStatus, status) => {
    fetchMock.mockResolvedValueOnce(response({ participants: [attendanceRow(previousStatus)], total: 1 }));
    fetchMock.mockResolvedValueOnce(response(attendanceMutation(status, previousStatus)));
    fetchMock.mockResolvedValueOnce(response({ participants: [attendanceRow(status, "revision-2")], total: 1 }));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiAttendancePanel eventId="event-1" divisionId="division-1" />); });
    await settle();
    const label = status === "present" ? "Présent" : status === "absent" ? "Absent" : "Non vérifiée";
    const statusButton = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === label);
    expect(statusButton).toBeTruthy();
    await act(async () => { statusButton?.onClick(); await Promise.resolve(); });
    await settle();
    const mutationCall = fetchCalls().find((call) => call[1]?.method === "POST");
    expect(jsonBody(mutationCall)).toEqual(expect.objectContaining({ participantId: "participant-1", status, expectedUpdatedAt: "revision-1", divisionId: "division-1" }));
    expect(fetchCalls().filter((call) => call[1]?.method !== "POST")).toHaveLength(2);
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "status" })).children).toBe("Présence enregistrée avec sa provenance.");
    expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(0);
    expect(renderer.root.findAllByType("span").map((node) => propsOf<StatusProps>(node).children)).toContain(status);
    expect(renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === label)?.disabled).toBe(false);
    renderer.unmount();
  });

  it.each(["present", "absent", "unknown"] as const)("confirms an idempotent %s attendance mutation without claiming a new audit event", async (status) => {
    fetchMock.mockResolvedValueOnce(response({ participants: [attendanceRow(status)], total: 1 }));
    fetchMock.mockResolvedValueOnce(response(attendanceMutation(status, status)));
    fetchMock.mockResolvedValueOnce(response({ participants: [attendanceRow(status)], total: 1 }));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiAttendancePanel eventId="event-1" divisionId="division-1" />); });
    await settle();
    const label = status === "present" ? "Présent" : status === "absent" ? "Absent" : "Non vérifiée";
    const statusButton = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === label);
    await act(async () => { statusButton?.onClick(); await Promise.resolve(); });
    await settle();
    expect(fetchCalls().filter((call) => call[1]?.method !== "POST")).toHaveLength(2);
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "status" })).children).toBe("Statut déjà à jour. Aucune nouvelle modification enregistrée.");
    expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(0);
    expect(renderer.root.findAllByType("span").map((node) => propsOf<StatusProps>(node).children)).toContain(status);
    expect(statusButton?.disabled).toBe(false);
    renderer.unmount();
  });

  it("surfaces a refused attendance mutation without claiming success or refreshing", async () => {
    fetchMock.mockResolvedValueOnce(response({ participants: [attendanceRow("unknown")], total: 1 }));
    fetchMock.mockResolvedValueOnce(response({ error: "Décision concurrente refusée" }, 409));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiAttendancePanel eventId="event-1" divisionId="division-1" />); });
    await settle();
    const statusButton = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "Présent");
    await act(async () => { statusButton?.onClick(); await Promise.resolve(); });
    await settle();
    expect(fetchCalls().filter((call) => call[1]?.method !== "POST")).toHaveLength(1);
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "alert" })).children).toBe("Décision concurrente refusée");
    expect(renderer.root.findAllByProps({ role: "status" })).toHaveLength(0);
    expect(statusButton?.disabled).toBe(false);
    renderer.unmount();
  });

  it("keeps the mutation confirmation when the refresh GET is unavailable", async () => {
    fetchMock.mockResolvedValueOnce(response({ participants: [attendanceRow("unknown")], total: 1 }));
    fetchMock.mockResolvedValueOnce(response(attendanceMutation("present")));
    fetchMock.mockResolvedValueOnce(response({ error: "Roster indisponible" }, 503));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiAttendancePanel eventId="event-1" divisionId="division-1" />); });
    await settle();
    const statusButton = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "Présent");
    await act(async () => { statusButton?.onClick(); await Promise.resolve(); });
    await settle();
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "status" })).children).toBe("Présence enregistrée avec sa provenance.");
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "alert" })).children).toBe("Présence enregistrée, mais l’affichage n’a pas pu être actualisé.");
    expect(renderer.root.findAllByProps({ role: "alert" }).map((node) => propsOf<StatusProps>(node).children)).not.toContain("Roster indisponible");
    expect(statusButton?.disabled).toBe(false);
    renderer.unmount();
  });

  it("keeps an idempotent confirmation when the refresh GET is unavailable", async () => {
    fetchMock.mockResolvedValueOnce(response({ participants: [attendanceRow("present")], total: 1 }));
    fetchMock.mockResolvedValueOnce(response(attendanceMutation("present", "present")));
    fetchMock.mockResolvedValueOnce(response({ error: "Roster indisponible" }, 503));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiAttendancePanel eventId="event-1" divisionId="division-1" />); });
    await settle();
    const statusButton = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "Présent");
    await act(async () => { statusButton?.onClick(); await Promise.resolve(); });
    await settle();
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "status" })).children).toBe("Statut déjà à jour. Aucune nouvelle modification enregistrée.");
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "alert" })).children).toBe("Statut déjà à jour, mais l’affichage n’a pas pu être actualisé.");
    expect(statusButton?.disabled).toBe(false);
    renderer.unmount();
  });

  it("rejects a mutation confirmation that does not match the requested operation", async () => {
    fetchMock.mockResolvedValueOnce(response({ participants: [attendanceRow("unknown")], total: 1 }));
    fetchMock.mockResolvedValueOnce(response(attendanceMutation("absent")));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiAttendancePanel eventId="event-1" divisionId="division-1" />); });
    await settle();
    const statusButton = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "Présent");
    await act(async () => { statusButton?.onClick(); await Promise.resolve(); });
    await settle();
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "alert" })).children).toBe("La confirmation du pointage ne correspond pas à la décision demandée.");
    expect(renderer.root.findAllByProps({ role: "status" })).toHaveLength(0);
    expect(fetchCalls().filter((call) => call[1]?.method !== "POST")).toHaveLength(1);
    expect(statusButton?.disabled).toBe(false);
    renderer.unmount();
  });

  it("rejects a malformed attendance mutation response and releases the busy state", async () => {
    fetchMock.mockResolvedValueOnce(response({ participants: [attendanceRow("unknown")], total: 1 }));
    fetchMock.mockResolvedValueOnce(response({ attendance: { attendanceStatus: "present" } }));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiAttendancePanel eventId="event-1" divisionId="division-1" />); });
    await settle();
    const statusButton = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "Présent");
    await act(async () => { statusButton?.onClick(); await Promise.resolve(); });
    await settle();
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "alert" })).children).toBe("La confirmation du pointage a renvoyé des données incomplètes.");
    expect(fetchCalls().filter((call) => call[1]?.method !== "POST")).toHaveLength(1);
    expect(statusButton?.disabled).toBe(false);
    renderer.unmount();
  });

  it("keeps identity linking unauthenticated and verifies a linked state without PII", () => {
    const anonymous = renderIdentity();
    expect(anonymous).toContain("J’ai participé à cet événement");
    expect(anonymous).toContain("Se connecter");
    authState.isSignedIn = true;
    const linked = renderIdentity();
    expect(linked).toContain("Relier le compte");
    expect(linked).not.toContain("email");
  });

  it("loads result review actions and posts the selected division", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(response({ results: [{ teamId: "team-1", teamNumber: 1, publicName: "Alpha", latestSubmission: { id: "submission-1", version: 1, status: "submitted", submittedAt: "2026-06-01" }, score: null }] }));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiResultReviewPanel eventId="event-1" divisionId="division-1" />); });
    await settle();
    const certify = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "Certifier");
    expect(certify).toBeTruthy();
    fetchMock.mockResolvedValueOnce(response({}));
    fetchMock.mockResolvedValueOnce(response({ results: [] }));
    await act(async () => { certify?.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-1/results", expect.objectContaining({ method: "POST" }));
    expect(jsonBody(fetchCalls()[1])).toEqual(expect.objectContaining({ divisionId: "division-1", decision: "certified" }));
    renderer.unmount();
  });

  it("keeps team access generation opaque and revocation effective in the interactive surface", async () => {
    fetchMock.mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") return Promise.resolve(response({ accessUrl: "/spogomi/paris/equipe?access=opaque-ref", expiresAt: "2026-06-01T12:00:00.000Z" }));
      if (init?.method === "DELETE") return Promise.resolve(response({ revoked: true }));
      return Promise.resolve(response({}));
    });
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiTeamAccessLinks eventId="event-1" teams={[{ id: "team-1", team_number: 1, public_name: "Alpha" }]} />); });

    const generate = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "Générer");
    await act(async () => { generate?.onClick(); await Promise.resolve(); });
    const generatedLink = renderer.root.findAllByType("textarea")[0];
    const generatedLinkProps = propsOf<TextareaProps>(generatedLink);
    expect(generatedLinkProps.value).toBe("/spogomi/paris/equipe?access=opaque-ref");
    expect(renderer.root.findAllByType("a").some((link) => propsOf<LinkProps>(link).href === generatedLinkProps.value)).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-1/teams/team-1/access", expect.objectContaining({ method: "POST" }));

    const revoke = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "Révoquer");
    await act(async () => { revoke?.onClick(); await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-1/teams/team-1/access", expect.objectContaining({ method: "DELETE" }));
    expect(renderer.root.findAllByType("textarea")).toHaveLength(0);
    renderer.unmount();
  });

  it("publishes consolidation with the displayed source hash and rereads the new projection", async () => {
    const preview = {
      event: { id: "event-1", action_id: "action-1", name: "Paris", location_label: "Paris", starts_at: "2026-06-01", ends_at: null, state: "finished", environmental_mapping_version: "mapping-v1" },
      mappings: [],
      currentProjection: null,
      projection: {
        actionId: "action-1", projectionVersion: "v1", sourceHash: "hash-a", readyForPublication: true,
        teamsIncluded: 1, participantsPresent: 2, totalWasteMassGrams: 1200, cigaretteButtsMassGrams: 30, cigaretteButtsCount: 4,
        categoriesWithoutMapping: [], excludedMeasures: [], organizer: null, officialRoute: null,
      },
    };
    const reread = { ...preview, currentProjection: { id: "projection-1", projectionRevision: 1, sourceHash: "hash-a", status: "published" } };
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(() => Promise.resolve(response(preview))).mockImplementationOnce(() => Promise.resolve(response({ published: true }))).mockImplementationOnce(() => Promise.resolve(response(reread)));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiConsolidationPanel eventId="event-1" />); });
    await settle();

    const publish = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "Publier le bilan");
    await act(async () => { publish?.onClick(); await Promise.resolve(); });
    const publishCall = fetchCalls().find((call) => call[1]?.method === "POST");
    expect(publishCall?.[0]).toBe("/api/spogomi/events/event-1/consolidation");
    expect(jsonBody(publishCall)).toEqual({ action: "publish", sourceHash: "hash-a" });
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "status" })).children).toBe("Bilan consolidé publié dans l’action CleanMyMap cible.");
    expect(JSON.stringify(renderer.toJSON())).toContain("Projection courante");
    renderer.unmount();
  });

  it("renders a rejected consolidation without converting a conflict into a success", async () => {
    const preview = {
      event: { id: "event-1", action_id: "action-1", name: "Paris", location_label: "Paris", starts_at: "2026-06-01", ends_at: null, state: "finished", environmental_mapping_version: "mapping-v1" },
      mappings: [], currentProjection: null,
      projection: { actionId: "action-1", projectionVersion: "v1", sourceHash: "hash-a", readyForPublication: true, teamsIncluded: 1, participantsPresent: 1, totalWasteMassGrams: null, cigaretteButtsMassGrams: null, cigaretteButtsCount: null, categoriesWithoutMapping: [], excludedMeasures: [], organizer: null, officialRoute: null },
    };
    fetchMock.mockResolvedValueOnce(response(preview)).mockResolvedValueOnce(response({ error: "La source a changé." }, 409));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiConsolidationPanel eventId="event-1" />); });
    await settle();
    const publish = renderer.root.findAllByType("button").map(buttonProps).find((button) => button.children === "Publier le bilan");
    await act(async () => { publish?.onClick(); await Promise.resolve(); });
    expect(propsOf<StatusProps>(renderer.root.findByProps({ role: "alert" })).children).toBe("La source a changé.");
    expect(renderer.root.findAllByProps({ role: "status" })).toHaveLength(0);
    renderer.unmount();
  });

  it("renders the team result revision payload", async () => {
    const form = { event: { name: "Paris", mode: "casual" }, team: { teamNumber: 1, publicName: "Alpha" }, categories: [{ id: "category-1", code: "plastic", label: "Plastique", measurementKind: "mass", unit: "g", isComplete: true }], presentParticipants: 3, officialScoreAvailable: true, latestSubmission: null };
    let resultForm!: ReturnType<typeof create>;
    act(() => { resultForm = create(<SpogomiTeamResultForm form={form as never} />); });
    fetchMock.mockResolvedValueOnce(response({ submission: { id: "submission-1" } }));
    await act(async () => { resultForm.root.findAllByType("button").map(buttonProps).find((button) => String(button.children).includes("Soumettre"))?.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/team-form", expect.objectContaining({ method: "POST" }));
    expect(jsonBody(fetchCalls().at(-1))).toEqual(expect.objectContaining({ status: "submitted", items: expect.any(Array) }));
    resultForm.unmount();
  });
});

function renderIdentity() {
  return renderToStaticMarkup(<SpogomiIdentityLinkCard eventId="event-1" signInHref="/sign-in" />);
}
