import { describe, expect, it } from "vitest";
import {
  buildModerationProgressionState,
  canViewModerationProgression,
  deriveResolvedModerationCases,
  reconcileModerationProgressionForUser,
  resolveModerationCaseFromAudit,
  type ModerationAuditRow,
} from "./moderation-progression";

const actorUserId = "admin-1";

function audit(
  overrides: Partial<ModerationAuditRow> & Pick<ModerationAuditRow, "target_id" | "details">,
): ModerationAuditRow {
  return {
    operation_id: "op-1",
    at: "2026-09-27T10:00:00.000Z",
    actor_user_id: actorUserId,
    operation_type: "moderation",
    outcome: "success",
    ...overrides,
  };
}

function actionDecision(targetId = "action-1", operationId = "op-action"): ModerationAuditRow {
  return audit({
    operation_id: operationId,
    target_id: targetId,
    details: {
      entityType: "action",
      targetStatus: "approved",
      targetUserId: "creator-1",
      previousValue: { status: "pending" },
      newValue: { status: "approved" },
    },
  });
}

function participationDecision(): ModerationAuditRow {
  return audit({
    operation_id: "op-participation",
    target_id: "action-2",
    details: {
      operation: "admin_review_accept",
      participantUserId: "participant-1",
      targetUserId: "participant-1",
      decision: "accept",
    },
  });
}

function cleanPlaceDecision(): ModerationAuditRow {
  return audit({
    operation_id: "op-clean-place",
    target_id: "spot-1",
    details: {
      entityType: "clean_place",
      sourceTable: "trash_spotter_spots",
      targetUserId: "reporter-1",
      previousValue: { status: "new" },
      newValue: { status: "validated" },
    },
  });
}

describe("moderation progression", () => {
  it("compte un dossier action une seule fois et exclut les opérations non résolutives", () => {
    expect(deriveResolvedModerationCases([
      actionDecision("action-1", "op-first"),
      actionDecision("action-1", "op-replay"),
      audit({
        operation_id: "op-error",
        target_id: "action-error",
        outcome: "error",
        details: { entityType: "action", targetStatus: "approved", previousValue: { status: "pending" } },
      }),
      audit({
        operation_id: "op-visibility",
        target_id: "action-visibility",
        details: { entityType: "action", operation: "hide_action", targetStatus: "approved", previousValue: { status: "approved" } },
      }),
      audit({
        operation_id: "op-round-trip",
        target_id: "action-round-trip",
        details: { entityType: "action", targetStatus: "rejected", previousValue: { status: "approved" } },
      }),
      audit({
        operation_id: "op-automatic",
        target_id: "action-automatic",
        details: { entityType: "action", automatic: true, targetStatus: "approved", previousValue: { status: "pending" } },
      }),
    ], actorUserId)).toEqual([
      expect.objectContaining({ caseId: "action:action-1" }),
    ]);
  });

  it("compte une correction d’impact motivée et refuse une correction partielle", () => {
    expect(resolveModerationCaseFromAudit(
      audit({
        target_id: "action-impact",
        details: {
          entityType: "action",
          operation: "correct_impact",
          reason: "Mesure terrain vérifiée",
          targetUserId: "creator-2",
        },
      }),
      actorUserId,
    )).toMatchObject({ caseId: "action:action-impact", operation: "correct_impact" });

    expect(resolveModerationCaseFromAudit(
      audit({
        target_id: "action-impact-invalid",
        details: { entityType: "action", operation: "correct_impact", reason: "ok" },
      }),
      actorUserId,
    )).toBeNull();
  });

  it("reconnaît les familles action, participation et clean place", () => {
    const cases = deriveResolvedModerationCases([
      actionDecision(),
      participationDecision(),
      cleanPlaceDecision(),
    ], actorUserId);

    expect(cases.map((item) => item.family).sort()).toEqual([
      "action",
      "clean_place",
      "participation",
    ]);
  });

  it("exclut une décision sur ses propres données et ne déduit pas les droits d’un libellé", () => {
    expect(resolveModerationCaseFromAudit(
      actionDecision("action-own"),
      actorUserId,
    )).toBeTruthy();
    expect(resolveModerationCaseFromAudit(
      audit({
        target_id: "action-own",
        details: {
          entityType: "action",
          targetStatus: "approved",
          targetUserId: actorUserId,
          previousValue: { status: "pending" },
        },
      }),
      actorUserId,
    )).toBeNull();

    expect(canViewModerationProgression({ userId: actorUserId, activeRole: "admin" }, actorUserId)).toBe(true);
    expect(canViewModerationProgression({ userId: actorUserId, activeRole: "benevole" }, actorUserId)).toBe(false);
    expect(canViewModerationProgression({ userId: actorUserId, activeRole: "admin" }, "other-user")).toBe(false);
  });

  it("utilise l’échelle gem commune et ne crédite de l’XP qu’aux paliers", () => {
    expect(buildModerationProgressionState(0).currentValue).toBe(0);
    expect(buildModerationProgressionState(1)).toMatchObject({
      metric: "resolvedModerationCases",
      currentValue: 1,
      xpContribution: 1,
    });
    expect(buildModerationProgressionState(2).xpContribution).toBe(1);
    expect(buildModerationProgressionState(3).xpContribution).toBe(2);
  });

  it("reconstruit les événements depuis l’audit et retire les faits devenus invalides", async () => {
    let auditRows: ModerationAuditRow[] = [
      actionDecision(),
      participationDecision(),
      cleanPlaceDecision(),
    ];
    const inserted: Record<string, unknown>[] = [];
    const chain = (result: unknown) => {
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        order: () => query,
        limit: () => query,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    };
    const supabase = {
      from: (table: string) => {
        if (table === "admin_operations_audit") {
          return chain({ data: auditRows, error: null });
        }
        if (table === "progression_events") {
          return {
            select: () => chain({ data: [], error: null }),
            delete: () => chain({ error: null }),
            insert: (row: Record<string, unknown>) => {
              inserted.push(row);
              return Promise.resolve({ error: null });
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };

    await reconcileModerationProgressionForUser(supabase as never, actorUserId);
    expect(inserted.filter((row) => row.event_type === "moderation_case_resolved")).toHaveLength(3);
    expect(inserted.filter((row) => row.event_type === "moderation_multi_family")).toHaveLength(1);
    expect(inserted.filter((row) => row.event_type === "moderation_case_resolved").every((row) => row.xp_awarded === 0)).toBe(true);

    inserted.length = 0;
    auditRows = [actionDecision()];
    await reconcileModerationProgressionForUser(supabase as never, actorUserId);
    expect(inserted.filter((row) => row.event_type === "moderation_case_resolved")).toHaveLength(1);
    expect(inserted.some((row) => row.event_type === "moderation_multi_family")).toBe(false);
  });
});
