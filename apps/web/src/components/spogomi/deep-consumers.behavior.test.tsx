import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
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
import { SpogomiTeamResultForm } from "./spogomi-team-result-form";

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const settle = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve(); }); };

const dashboard = {
  divisions: [{ id: "division-1", division_type: "casual", regulation_version: "rules-v1" }],
  teams: [{ id: "team-1", division_id: "division-1", team_number: 1, public_name: "Alpha" }],
  categories: [{ id: "category-1", division_id: "division-1", label: "Plastique", measurement_kind: "mass", unit: "g" }],
  operations: [], returns: [], incidents: [], measurements: [],
};

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
    expect(renderer.root.findByType("h2").props.children).toContain("Terrain");
    expect(renderer.root.findAllByType("h3").map((node) => node.props.children)).toContain("Phase officielle");
    const phaseButton = renderer.root.findAllByType("button").find((button) => button.props.children === "collection");
    expect(phaseButton).toBeTruthy();
    await act(async () => { phaseButton?.props.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-1/field-operations", expect.objectContaining({ method: "POST" }));
    const mutationCall = [...fetchMock.mock.calls].reverse().find((call) => call[1]?.method === "POST");
    const payload = JSON.parse(mutationCall?.[1]?.body as string) as Record<string, unknown>;
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
    const phaseButton = renderer.root.findAllByType("button").find((button) => button.props.children === "collection");
    expect(phaseButton?.props.disabled).toBe(false);
    await act(async () => { phaseButton?.props.onClick(); await Promise.resolve(); });
    expect(renderer.root.findAllByType("button").find((button) => button.props.children === "collection")?.props.disabled).toBe(true);
    resolvePost(response({}));
    await settle();
    expect(renderer.root.findAllByType("button").find((button) => button.props.children === "collection")?.props.disabled).toBe(false);
    expect(renderer.root.findByProps({ role: "status" }).props.children).toBe("Décision enregistrée avec sa provenance.");
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
    const phaseButton = renderer.root.findAllByType("button").find((button) => button.props.children === "collection");
    await act(async () => { phaseButton?.props.onClick(); await Promise.resolve(); });
    await settle();
    expect(renderer.root.findByProps({ role: "status" }).props.children).toBe("Échec réseau synthétique");
    expect(renderer.root.findAllByType("button").find((button) => button.props.children === "collection")?.props.disabled).toBe(false);
    renderer.unmount();
  });

  it("loads attendance and sends revision-aware status mutations", async () => {
    fetchMock.mockResolvedValueOnce(response({ participants: [{ id: "participant-1", divisionId: "division-1", displayName: "Participant synthétique", externalReference: "P-1", place: 1, team: null, attendanceStatus: "unknown", registrationStatus: "registered", updatedAt: "revision-1" }], total: 1 }));
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiAttendancePanel eventId="event-1" divisionId="division-1" />); });
    await settle();
    expect(renderer.root.findByType("h2").props.children).toBe("Accueil et présences");
    const statusButton = renderer.root.findAllByType("button").find((button) => String(button.props.children).includes("Présent"));
    expect(statusButton).toBeTruthy();
    fetchMock.mockResolvedValueOnce(response({ attendanceStatus: "present" }));
    await act(async () => { statusButton?.props.onClick(); });
    const mutationCall = [...fetchMock.mock.calls].reverse().find((call) => call[1]?.method === "POST");
    const payload = JSON.parse(mutationCall?.[1]?.body as string) as Record<string, unknown>;
    expect(payload).toEqual(expect.objectContaining({ participantId: "participant-1", expectedUpdatedAt: "revision-1", divisionId: "division-1" }));
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
    const certify = renderer.root.findAllByType("button").find((button) => button.props.children === "Certifier");
    expect(certify).toBeTruthy();
    fetchMock.mockResolvedValueOnce(response({}));
    fetchMock.mockResolvedValueOnce(response({ results: [] }));
    await act(async () => { certify?.props.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-1/results", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual(expect.objectContaining({ divisionId: "division-1", decision: "certified" }));
    renderer.unmount();
  });

  it("renders the team result revision payload", async () => {
    const form = { event: { name: "Paris", mode: "casual" }, team: { teamNumber: 1, publicName: "Alpha" }, categories: [{ id: "category-1", code: "plastic", label: "Plastique", measurementKind: "mass", unit: "g", isComplete: true }], presentParticipants: 3, officialScoreAvailable: true, latestSubmission: null };
    let resultForm!: ReturnType<typeof create>;
    act(() => { resultForm = create(<SpogomiTeamResultForm form={form as never} />); });
    fetchMock.mockResolvedValueOnce(response({ submission: { id: "submission-1" } }));
    await act(async () => { resultForm.root.findAllByType("button").find((button) => String(button.props.children).includes("Soumettre"))?.props.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/team-form", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls.at(-1)?.[1]?.body as string)).toEqual(expect.objectContaining({ status: "submitted", items: expect.any(Array) }));
    resultForm.unmount();
  });
});

function renderIdentity() {
  return renderToStaticMarkup(<SpogomiIdentityLinkCard eventId="event-1" signInHref="/sign-in" />);
}
