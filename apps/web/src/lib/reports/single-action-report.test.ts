import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";

const loadActionByIdMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const toActionContractMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store-queries", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/actions/unified-source/contracts", () => ({ toActionContract: toActionContractMock }));

import {
  buildSingleActionReportGenerationInput,
  resolveSingleActionReportContract,
  SingleActionReportTargetUnavailableError,
} from "./single-action-report";

const actionId = "11111111-1111-4111-8111-111111111111";
const contract = buildActionDataContract({
  id: actionId,
  type: "action",
  status: "approved",
  source: "actions",
  createdByClerkId: "owner-1",
  publishedAt: "2026-08-27T10:00:00.000Z",
  observedAt: "2026-08-27",
  createdAt: "2026-08-26T10:00:00.000Z",
  locationLabel: "Parc canonique",
  latitude: 48.85,
  longitude: 2.35,
  wasteKg: 3,
  cigaretteButts: 12,
  volunteersCount: 4,
  durationMinutes: 60,
  actionPhase: "post_action_complete",
  preparationData: { actionTitle: "Action terrain canonique" },
});

const row = {
  id: actionId,
  status: "approved",
  action_phase: "post_action_complete",
  published_at: "2026-08-27T10:00:00.000Z",
  moderation_visibility: "visible",
};

const modules = {
  dataAndCartography: true,
  transparencyAndMethods: true,
  rawData: true,
  detailedFiles: true,
};

describe("single-action report server boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({});
    loadActionByIdMock.mockResolvedValue(row);
    toActionContractMock.mockReturnValue(contract);
  });

  it("resolves only an approved, completed, visible, published action", async () => {
    await expect(resolveSingleActionReportContract(actionId)).resolves.toBe(contract);
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(loadActionByIdMock).toHaveBeenCalledWith({}, actionId);
  });

  it.each([
    ["missing", null],
    ["draft", { ...row, status: "pending" }],
    ["pre-action", { ...row, action_phase: "pre_action" }],
    ["refused", { ...row, status: "rejected" }],
    ["hidden", { ...row, moderation_visibility: "hidden" }],
    ["unpublished", { ...row, published_at: null }],
  ])("rejects %s targets", async (_label, value) => {
    loadActionByIdMock.mockResolvedValueOnce(value);
    await expect(resolveSingleActionReportContract(actionId)).rejects.toBeInstanceOf(
      SingleActionReportTargetUnavailableError,
    );
    expect(toActionContractMock).not.toHaveBeenCalled();
  });

  it("builds one server-owned action snapshot with immutable provenance", () => {
    const input = buildSingleActionReportGenerationInput({
      request: { type: "single_action", actionId },
      contract,
      detailLevel: "default",
      modules,
      now: new Date("2026-08-27T12:30:00.000Z"),
    });

    expect(input.scopeKind).toBe("single_action");
    expect(input.scopeValue).toBe(actionId);
    expect(input.payload.snapshotSchemaVersion).toBe(1);
    expect(input.payload.provenance).toEqual({
      type: "single_action",
      actionId,
      source: "public.actions",
      resolvedAt: "2026-08-27T12:30:00.000Z",
    });
    expect(input.payload.data.generatedAt).toBe("2026-08-27T12:30:00.000Z");
    expect(input.payload.data.rows).toHaveLength(1);
    expect(input.payload.data.rows?.[0]?.Lieu).toBe("Parc canonique");
    expect(JSON.stringify(input.payload)).not.toContain("another-action");
    expect(JSON.stringify(input.payload)).not.toContain("Valeur injectée");
  });

  it("keeps missing measures unknown in the server snapshot", () => {
    const input = buildSingleActionReportGenerationInput({
      request: { type: "single_action", actionId },
      contract: { ...contract, metadata: { ...contract.metadata, wasteKg: null, cigaretteButts: null, volunteersCount: null } },
      detailLevel: "default",
      modules,
      now: new Date("2026-08-27T12:30:00.000Z"),
    });

    const json = JSON.stringify(input.payload);
    expect(json).toContain('"Masse_Kg_Impact":null');
    expect(json).toContain('"Megots":null');
    expect(json).toContain('"Bénévoles":null');
    expect(json).toContain("n/a");
  });
});
