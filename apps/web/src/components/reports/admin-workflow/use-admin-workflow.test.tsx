import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionListItem, ActionListResponse } from "@/lib/actions/types";
import { useAdminWorkflow } from "./use-admin-workflow";

const mocks = vi.hoisted(() => ({
  fetchActions: vi.fn(),
  fetchAudit: vi.fn(),
}));

vi.mock("@/lib/actions/http", () => ({ fetchActions: mocks.fetchActions }));
vi.mock("./services", async () => {
  const actual = await vi.importActual<typeof import("./services")>("./services");
  return { ...actual, fetchAdminOperationAudit: mocks.fetchAudit };
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function item(id: string, overrides: Partial<ActionListItem> = {}): ActionListItem {
  return {
    id,
    created_at: "2026-10-01T10:00:00.000Z",
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    association_name: "Association A",
    action_date: "2026-10-01",
    location_label: "Paris 5e",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 2,
    cigarette_butts: 10,
    volunteers_count: 2,
    duration_minutes: 45,
    notes: "Notes",
    status: "pending",
    record_type: "action",
    source: "actions",
    source_status: "pending",
    notes_plain: "Plain notes",
    submission_mode: "complete",
    contract: {
      id,
      type: "action",
      status: "pending",
      source: "actions",
      location: { label: "Paris 5e", latitude: 48.85, longitude: 2.35 },
      geometry: { kind: "point", coordinates: [[2.35, 48.85]], geojson: null, confidence: null, geometrySource: "manual", origin: "manual" },
      dates: { observedAt: "2026-10-01T10:00:00.000Z", createdAt: null, importedAt: null, validatedAt: null },
      metadata: {
        actorName: "Alice", associationName: "Association A", notes: "Notes", notesPlain: "Plain notes",
        groupJoinEnabled: null, actionPhase: null, preparationData: null, wasteKg: 2,
        cigaretteButts: 10, volunteersCount: 2, durationMinutes: 45, manualDrawing: null,
      },
    },
    ...overrides,
  };
}

function response(items: ActionListItem[]): ActionListResponse {
  return { status: "ok", count: items.length, items };
}

function renderHook(initialPreview: ActionListResponse | null = response([item("action-1")]), initialAuditItems = []) {
  let result!: ReturnType<typeof useAdminWorkflow>;
  let renderer!: ReactTestRenderer;
  function Harness() { result = useAdminWorkflow({ initialPreview, initialAuditItems }); return null; }
  act(() => { renderer = create(React.createElement(Harness)); });
  return { get result() { return result; }, renderer };
}

describe("useAdminWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchActions.mockResolvedValue(response([]));
    mocks.fetchAudit.mockResolvedValue({ items: [] });
  });

  it("builds scope options, filters preview rows and resets invalid scope values", () => {
    const hook = renderHook(response([
      item("a", { created_by_clerk_id: "account-a", actor_name: "Alice", association_name: "Association A", location_label: "Paris 5e" }),
      item("b", { created_by_clerk_id: "account-b", actor_name: "Bob", association_name: "Association B", location_label: "Paris 12e" }),
    ]));
    expect(hook.result.scopeOptions.accounts.map((option) => option.value)).toEqual(["account-a", "account-b"]);
    expect(hook.result.associationOptions).toEqual(["Association A", "Association B"]);
    act(() => { hook.result.setScopeKind("account"); hook.result.setScopeValue("account-a"); });
    expect(hook.result.scopeValue).toBe("account-a");
    expect(hook.result.previewRows).toHaveLength(1);
    act(() => hook.result.setScopeValue("missing-account"));
    expect(hook.result.scopeValue).toBe("account-a");
    act(() => { hook.result.setScopeKind("global"); hook.result.setScopeValue("stale"); });
    expect(hook.result.scopeValue).toBe("");
  });

  it("selects action and clean-place entities with complete and fallback drafts", () => {
    const action = item("action-1", {
      created_by_clerk_id: " creator-1 ",
      manual_drawing: { kind: "LineString", coordinates: [[2, 48], [3, 49]] } as never,
      waste_breakdown: { recyclablesKg: 1, glassKg: null, householdWasteKg: null, otherWasteKg: null, unusualObjects: "bouteille", specialHandlingWaste: null },
    });
    const place = item("place-1", {
      source: "trash_spotter_spots",
      record_type: "clean_place",
      location_label: "Quai propre",
      actor_name: null,
      association_name: null,
      notes: null,
      notes_plain: null,
      latitude: null,
      longitude: null,
      contract: { ...action.contract!, type: "clean_place", location: { label: "Quai propre", latitude: null, longitude: null }, metadata: action.contract!.metadata },
    });
    const hook = renderHook(response([action, place]), [{ operationId: "op-1" } as never]);
    act(() => hook.result.selectActionForModeration(action));
    expect(hook.result.moderationEntityType).toBe("action");
    expect(hook.result.moderationId).toBe("action-1");
    expect(hook.result.selectedActionCreatorId).toBe("creator-1");
    expect(hook.result.actionEditDraft).toMatchObject({ manualDrawingJson: expect.stringContaining("LineString"), wasteRecyclablesKg: "1" });
    expect(hook.result.cleanPlaceEditDraft).toBeNull();
    act(() => hook.result.selectActionForModeration(place));
    expect(hook.result.moderationEntityType).toBe("clean_place");
    expect(hook.result.selectedActionCreatorId).toBeNull();
    expect(hook.result.actionEditDraft).toBeNull();
    expect(hook.result.cleanPlaceEditDraft).toEqual({ label: "Quai propre", spotType: "clean_place", latitude: "", longitude: "", notes: "" });
  });

  it("resets confirmation state when entity or status changes and preserves audit data", () => {
    const hook = renderHook(response([item("action-1")]), [{ operationId: "op-1" } as never]);
    act(() => {
      hook.result.setModerationId("action-1");
      hook.result.setActionStatus("rejected");
      hook.result.setModerationConfirmed(true);
      hook.result.setModerationConfirmationText("CONFIRMER MODERATION");
      hook.result.setModerationReason("Motif valide");
      hook.result.setModerationVisibility("hidden");
    });
    expect(hook.result.moderationConfirmed).toBe(true);
    act(() => hook.result.setActionStatus("rejected"));
    expect(hook.result.moderationConfirmed).toBe(false);
    expect(hook.result.moderationConfirmationText).toBe("");
    expect(hook.result.moderationReason).toBe("");
    expect(hook.result.moderationVisibility).toBe("unchanged");
    expect(hook.result.auditItems).toHaveLength(1);
  });

  it("builds export URLs, handles preview reload and records moderation errors without remote mutation", async () => {
    const hook = renderHook(response([item("action-1")]), []);
    expect(hook.result.csvExportUrl).toContain("/api/reports/actions.csv?");
    expect(hook.result.csvExportUrl).toContain("types=all");
    act(() => hook.result.reloadPreview());
    expect(mocks.fetchActions).toHaveBeenCalled();
    act(() => {
      hook.result.setModerationId("action-1");
      hook.result.setActionStatus("rejected");
      hook.result.setModerationConfirmed(true);
      hook.result.setModerationConfirmationText("CONFIRMER MODERATION");
    });
    await act(async () => hook.result.onModerateEntity());
    expect(hook.result.moderationState).toBe("error");
    expect(hook.result.errorMessage).toContain("motif");
    expect(hook.result.moderationJournal[0]?.outcome).toBeUndefined();
  });
});
