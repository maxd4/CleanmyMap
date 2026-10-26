import * as React from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("next/dynamic", () => ({ default: () => function DynamicComponent() { return React.createElement("div", { "data-dynamic": true }); } }));
vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("button", props, children) }));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("div", props, children) }));
vi.mock("@/components/ui/page-header", () => ({ PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => React.createElement("header", null, title, subtitle) }));
vi.mock("@/lib/spogomi/preparation", () => ({ validateProposedTeamFormation: () => ({ valid: true, errors: [] }) }));
vi.mock("@/lib/spogomi/types", () => ({ spogomiDivisionTypesForMode: () => ["casual", "world_cup"], spogomiModeLabel: (mode: string) => mode }));
vi.mock("./spogomi-team-access-links", () => ({ SpogomiTeamAccessLinks: () => React.createElement("div", { "data-child": "team-links" }) }));
vi.mock("./spogomi-result-review-panel", () => ({ SpogomiResultReviewPanel: () => React.createElement("div", { "data-child": "review" }) }));
vi.mock("./spogomi-reviewer-management", () => ({ SpogomiReviewerManagement: () => React.createElement("div", { "data-child": "reviewers" }) }));
vi.mock("./spogomi-consolidation-panel", () => ({ SpogomiConsolidationPanel: () => React.createElement("div", { "data-child": "consolidation" }) }));
vi.mock("./spogomi-volunteer-attestation-panel", () => ({ SpogomiVolunteerAttestationPanel: () => React.createElement("div", { "data-child": "attestation" }) }));
vi.mock("./spogomi-identity-assistance-panel", () => ({ SpogomiIdentityAssistancePanel: () => React.createElement("div", { "data-child": "assistance" }) }));
vi.mock("./spogomi-team-join-requests-panel", () => ({ SpogomiTeamJoinRequestsPanel: () => React.createElement("div", { "data-child": "join-requests" }) }));
vi.mock("./spogomi-admission-requests-panel", () => ({ SpogomiAdmissionRequestsPanel: () => React.createElement("div", { "data-child": "admission-requests" }) }));
vi.mock("./spogomi-attendance-panel", () => ({ SpogomiAttendancePanel: () => React.createElement("div", { "data-child": "attendance" }) }));
vi.mock("./spogomi-day-readiness-checklist", () => ({ SpogomiDayReadinessChecklist: () => React.createElement("div", { "data-child": "readiness" }) }));
vi.stubGlobal("fetch", fetchMock);
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

type ButtonProps = { children?: unknown; disabled?: boolean; onClick?: () => void | Promise<void> };
type FileInputProps = { type?: string; accept?: string; onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void };
type TabProps = { children?: React.ReactNode; onClick?: () => void };
type FetchCall = [RequestInfo | URL, RequestInit | undefined];

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

function fetchCalls(): FetchCall[] {
  return fetchMock.mock.calls as unknown as FetchCall[];
}

function jsonBody(call: FetchCall | undefined): Record<string, unknown> {
  return JSON.parse(String(call?.[1]?.body ?? "")) as Record<string, unknown>;
}

import { SpogomiPreparationWorkspace } from "./spogomi-preparation-workspace";

const body = {
  event: { id: "event-1", event_slug: "paris-2026", public_visibility: "private", public_results_visibility: "hidden", name: "Paris", location_label: "Paris", mode: "mixed", state: "draft", starts_at: "2026-06-01", ends_at: null, composition_revision: 2, team_size_config: { casual: { minMembers: 2, maxMembers: 3 } } },
  divisions: [{ id: "division-casual", event_id: "event-1", division_type: "casual", division_key: "casual", regulation_status: "complete", regulation_version: "rules-casual", regulation_source_reference: "fixture" }, { id: "division-world", event_id: "event-1", division_type: "world_cup", division_key: "world_cup", regulation_status: "incomplete", regulation_version: "rules-world" }],
  participants: [{ id: "participant-1", division_id: "division-casual", display_name: null, external_reference: "P-1", group_preference: null, team_id: null, attendance_status: "unknown", account_link_status: "unlinked", composition_eligible: false }],
  teams: [{ id: "team-1", division_id: "division-casual", team_number: 1, public_name: "Alpha", composition_state: "draft" }],
  route: null, categoryRules: [], eventAccess: [],
};

describe("SPOGOMI preparation workspace", () => {
  beforeEach(() => { vi.clearAllMocks(); fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } })); });

  it("loads mixed divisions, keeps cancelled identities blocked and renders section-scoped children", async () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiPreparationWorkspace eventId="event-1" section="teams" showAdminTeamJoinRequests />); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve(); });
    expect(renderer.root.findAll((node) => node.props.role === "tab")).toHaveLength(2);
    expect(renderer.root.findAll((node) => node.props.children === "Billet annulé ou supprimé : affectation bloquée. Une résolution organisateur est requise.")).toHaveLength(1);
    expect(renderer.root.findAll((node) => node.props["data-child"] === "team-links")).toHaveLength(1);
    expect(renderer.root.findAll((node) => node.props["data-child"] === "join-requests")).toHaveLength(1);
    expect(renderer.root.findAll((node) => node.props["data-child"] === "admission-requests")).toHaveLength(1);
    renderer.unmount();
  });

  it("renders the results publication guard and sends only the scoped action", async () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiPreparationWorkspace eventId="event-1" section="results" showHeader={false} />); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve(); });
    const publish = renderer.root.findAllByType("button").find((button) => String(button.props.children).includes("Publier les classements"));
    expect(publish).toBeTruthy();
    expect(publish?.props.disabled).toBe(true);
    renderer.unmount();
  });

  it("previews a synthetic roster, exposes its anomaly, then confirms only the selected rows", async () => {
    const preview = {
      sourceSystem: "cachan_ticketing", format: "csv", fileName: "synthetic-roster.csv", contentHash: "hash-roster", importKey: "import-roster", encoding: "utf-8", sheetName: null, headerRow: 1,
      rowsRead: 2, headers: ["ticket", "name"], unknownHeaders: [],
      rows: [{ rowNumber: 2, name: "Participant synthétique", externalReference: "TICKET-1", groupPreference: null }],
      errors: [{ rowNumber: 3, code: "empty_occupant", message: "Place sans occupant" }],
      mapping: { ticketReference: "ticket", name: "name" }, sheetCandidates: [], columnDiagnostics: [], missingFields: [], ambiguousFields: [],
      probableDuplicateRowNumbers: [], ignoredRowNumbers: [], cancelledRowNumbers: [], changedRowNumbers: [], conflictRowNumbers: [], rowEffects: { "2": "created" }, requiresExplicitSelection: false,
    };
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      const url = String(input);
      if (url.includes("/imports/preview")) return Promise.resolve(new Response(JSON.stringify(preview), { status: 200 }));
      if (url.includes("/imports/confirm")) return Promise.resolve(new Response(JSON.stringify({ imported: 1 }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    });
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiPreparationWorkspace eventId="event-1" section="teams" showHeader={false} />); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve(); });

    const file = new File(["ticket,name\nTICKET-1,Participant synthétique"], "synthetic-roster.csv", { type: "text/csv" });
    const fileInput = renderer.root.findAllByType("input").find((input) => input.props.type === "file" && String(input.props.accept).includes("csv"));
    expect(fileInput).toBeTruthy();
    await act(async () => { propsOf<FileInputProps>(fileInput!).onChange?.({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>); await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve(); });
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("Place sans occupant");
    expect(renderer.root.findAllByType("button").find((button) => button.props.children === "Confirmer la sélection")?.props.disabled).toBe(false);

    const confirm = renderer.root.findAllByType("button").find((button) => button.props.children === "Confirmer la sélection");
    await act(async () => { await propsOf<ButtonProps>(confirm!).onClick?.(); await Promise.resolve(); });
    const confirmCall = calls.find(([input, init]) => String(input).includes("/imports/confirm") && init?.method === "POST");
    expect(confirmCall).toBeTruthy();
    expect(confirmCall?.[1]?.body).toBeInstanceOf(FormData);
    renderer.unmount();
  });

  it("keeps team preview and lock actions revision-scoped", async () => {
    const teamPreview = {
      expectedRevision: 2, proposalFingerprint: "proposal-a", explanation: ["Composition déterministe"],
      participantCount: 1, assignedParticipantCount: 1, preservedTeamIds: [],
      formation: { teams: [{ draftKey: "team-1", teamNumber: 1, participantIds: ["participant-1"], compositionState: "draft", explanation: "incomplete_team" }], unassignedParticipantIds: [], reasons: {} },
    };
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/teams/auto") && init?.method === "POST" && String(init.body).includes("confirm")) return Promise.resolve(new Response(JSON.stringify({ confirmed: true }), { status: 200 }));
      if (url.includes("/teams/auto")) return Promise.resolve(new Response(JSON.stringify(teamPreview), { status: 200 }));
      if (url.includes("/teams/lock")) return Promise.resolve(new Response(JSON.stringify({ locked: true }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    });
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiPreparationWorkspace eventId="event-1" section="teams" showHeader={false} />); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve(); });
    const previewButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Prévisualiser ou régénérer");
    await act(async () => { await propsOf<ButtonProps>(previewButton!).onClick?.(); await Promise.resolve(); });
    expect(renderer.root.findByProps({ children: "Composition déterministe" })).toBeTruthy();
    const confirmButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Confirmer cette proposition");
    await act(async () => { await propsOf<ButtonProps>(confirmButton!).onClick?.(); await Promise.resolve(); });
    const confirmCall = fetchCalls().find((call) => String(call[0]).includes("/teams/auto") && String(call[1]?.body).includes('"confirm":true'));
    expect(jsonBody(confirmCall)).toEqual(expect.objectContaining({ expectedRevision: 2, proposalFingerprint: "proposal-a" }));
    const lockButton = renderer.root.findAllByType("button").find((button) => String(button.props.children).startsWith("Verrouiller"));
    await act(async () => { await propsOf<ButtonProps>(lockButton!).onClick?.(); await Promise.resolve(); });
    const lockCall = fetchCalls().find((call) => String(call[0]).includes("/teams/lock"));
    expect(jsonBody(lockCall)).toEqual({ divisionId: "division-casual", expectedRevision: 2 });
    renderer.unmount();
  });

  it("ignores a late projection response from a previous division selection", async () => {
    let resolveCasual!: (response: Response) => void;
    let resolveWorld!: (response: Response) => void;
    const casualProjection = new Promise<Response>((resolve) => { resolveCasual = resolve; });
    const worldProjection = new Promise<Response>((resolve) => { resolveWorld = resolve; });
    const casualBody = { ...body, participants: [{ ...body.participants[0], display_name: "Casual tardif" }], teams: [{ ...body.teams[0], public_name: "Équipe casual tardive" }] };
    const worldBody = { ...body, participants: [{ ...body.participants[0], division_id: "division-world", display_name: "World courant", composition_eligible: true }], teams: [{ ...body.teams[0], division_id: "division-world", public_name: "Équipe World courante" }] };
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("divisionId=division-casual")) return casualProjection;
      if (url.includes("divisionId=division-world")) return worldProjection;
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    });

    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiPreparationWorkspace eventId="event-1" section="teams" showHeader={false} />); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const worldTab = renderer.root.findAll((node) => node.props.role === "tab").find((node) => node.props.children === "World Cup");
    expect(worldTab).toBeTruthy();
    act(() => { propsOf<TabProps>(worldTab!).onClick?.(); });
    await act(async () => { resolveWorld(new Response(JSON.stringify(worldBody), { status: 200 })); await Promise.resolve(); });
    await act(async () => { resolveCasual(new Response(JSON.stringify(casualBody), { status: 200 })); await Promise.resolve(); });

    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("Équipe World courante");
    expect(rendered).not.toContain("Équipe casual tardive");
    renderer.unmount();
  });

  it("releases busy on division change without letting a stale operation release the current one", async () => {
    let resolveCasualOperation!: (response: Response) => void;
    let resolveWorldProjection!: (response: Response) => void;
    let resolveWorldOperation!: (response: Response) => void;
    const casualOperation = new Promise<Response>((resolve) => { resolveCasualOperation = resolve; });
    const worldProjection = new Promise<Response>((resolve) => { resolveWorldProjection = resolve; });
    const worldOperation = new Promise<Response>((resolve) => { resolveWorldOperation = resolve; });
    const casualPreview = {
      expectedRevision: 2, proposalFingerprint: "casual-late", explanation: ["Composition casual tardive"],
      participantCount: 1, assignedParticipantCount: 1, preservedTeamIds: [],
      formation: { teams: [{ draftKey: "team-1", teamNumber: 1, participantIds: ["participant-1"], compositionState: "draft", explanation: "late" }], unassignedParticipantIds: [], reasons: {} },
    };
    const worldPreview = {
      expectedRevision: 2, proposalFingerprint: "world-current", explanation: ["Composition World courante"],
      participantCount: 1, assignedParticipantCount: 1, preservedTeamIds: [],
      formation: { teams: [{ draftKey: "team-1", teamNumber: 1, participantIds: ["participant-1"], compositionState: "draft", explanation: "current" }], unassignedParticipantIds: [], reasons: {} },
    };
    const worldBody = { ...body, participants: [{ ...body.participants[0], division_id: "division-world", display_name: "World courant", composition_eligible: true }], teams: [{ ...body.teams[0], division_id: "division-world", public_name: "Équipe World courante" }] };
    let worldProjectionPending = true;
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/teams/auto") && url.includes("divisionId=division-casual")) return casualOperation;
      if (url.includes("/teams/auto") && url.includes("divisionId=division-world")) return worldOperation;
      if (url.includes("divisionId=division-world")) {
        if (worldProjectionPending) {
          worldProjectionPending = false;
          return worldProjection;
        }
        return Promise.resolve(new Response(JSON.stringify(worldBody), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    });

    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiPreparationWorkspace eventId="event-1" section="teams" showHeader={false} />); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const casualPreviewButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Prévisualiser ou régénérer");
    expect(casualPreviewButton?.props.disabled).toBe(false);
    await act(async () => { await propsOf<ButtonProps>(casualPreviewButton!).onClick?.(); await Promise.resolve(); });

    const worldTab = renderer.root.findAll((node) => node.props.role === "tab").find((node) => node.props.children === "World Cup");
    expect(worldTab).toBeTruthy();
    act(() => { propsOf<TabProps>(worldTab!).onClick?.(); });
    await act(async () => { resolveWorldProjection(new Response(JSON.stringify(worldBody), { status: 200 })); await Promise.resolve(); });

    const worldPreviewButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Prévisualiser ou régénérer");
    expect(worldPreviewButton?.props.disabled).toBe(false);
    await act(async () => { await propsOf<ButtonProps>(worldPreviewButton!).onClick?.(); await Promise.resolve(); });
    expect(renderer.root.findAllByType("button").find((button) => button.props.children === "Prévisualiser ou régénérer")?.props.disabled).toBe(true);

    await act(async () => { resolveCasualOperation(new Response(JSON.stringify(casualPreview), { status: 200 })); await Promise.resolve(); });
    expect(renderer.root.findAllByType("button").find((button) => button.props.children === "Prévisualiser ou régénérer")?.props.disabled).toBe(true);
    expect(JSON.stringify(renderer.toJSON())).toContain("Équipe World courante");
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Composition casual tardive");

    await act(async () => { resolveWorldOperation(new Response(JSON.stringify(worldPreview), { status: 200 })); await Promise.resolve(); await Promise.resolve(); });
    const finalRendered = JSON.stringify(renderer.toJSON());
    expect(finalRendered).toContain("Équipe World courante");
    expect(finalRendered).toContain("Composition World courante");
    expect(finalRendered).not.toContain("Composition casual tardive");
    expect(renderer.root.findAllByType("button").find((button) => button.props.children === "Prévisualiser ou régénérer")?.props.disabled).toBe(false);
    renderer.unmount();
  });
});
