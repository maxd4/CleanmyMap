import { type ComponentProps } from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingGamificationReconciliation } from "@/lib/gamification/gamification-reconciliation-notice";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import type { UserProgressionResponse } from "@/lib/gamification/progression-types";
import { GamificationReconciliationNotice } from "./gamification-reconciliation-notice";
import { GamificationRulesMigrationNotice } from "./gamification-rules-migration-notice";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

type ButtonProps = { children?: unknown; onClick: () => void | Promise<void> };
type AlertProps = { children?: unknown };

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

const progression = {
  summary: {
    progressions: [{ id: "participation", label: "Participation" }],
    milestones: [{ id: "first_trace", label: "Première trace utile" }],
  },
  badgeCatalog: [{ id: "badge-1", label: "Badge 1" }],
} as unknown as UserProgressionResponse;

const reconciliation = {
  notificationId: "notification-1",
  createdAt: "2026-10-26T10:00:00.000Z",
  seenAt: null,
  acknowledgedAt: null,
  unacknowledgedCount: 1,
  unseenCount: 1,
  receipt: {
    reconciliationId: "reconciliation-1",
    userId: "user-1",
    occurredAt: "2026-10-26T10:00:00.000Z",
    previousRulesVersion: "v1",
    currentRulesVersion: "v2",
    previousRulesRevision: 1,
    currentRulesRevision: 2,
    xp: { before: 100, after: 90, delta: -10, gained: 0, removed: 10 },
    level: { before: 4, after: 3, changed: true, direction: "down" },
    progressions: { added: [], removed: [], changed: [] },
    badges: { unlocked: [], removed: [], upgraded: [], downgraded: [] },
    milestones: { unlocked: [], removed: [] },
    eventChanges: { addedCount: 0, updatedCount: 0, removedCount: 1 },
    catalogChanges: { newProgressionIds: [], newMilestoneIds: [], retiredMechanicIds: [] },
    reasonCategory: "data_correction",
    hasUserVisibleChanges: true,
  },
} as PendingGamificationReconciliation;

const migrationSummary = {
  rulesMigration: { hasUnacknowledgedChanges: true, currentAppliedRulesRevision: 3 },
  progressions: [{ isNewSinceLastRulesMigration: true }],
  milestones: [{ isNewSinceLastRulesMigration: false }],
} as unknown as GamificationSummary;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function findButton(renderer: ReturnType<typeof create>, label: string) {
  return renderer.root.findAllByType("button").find((node) => propsOf<ButtonProps>(node).children === label)!;
}

type ReconciliationNoticeProps = ComponentProps<typeof GamificationReconciliationNotice>;
type MigrationNoticeProps = ComponentProps<typeof GamificationRulesMigrationNotice>;

function renderReconciliationNotice(
  overrides: Partial<ReconciliationNoticeProps> = {},
) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <GamificationReconciliationNotice
        reconciliation={reconciliation}
        progression={progression}
        locale="fr"
        onAcknowledged={vi.fn()}
        {...overrides}
      />,
    );
  });
  return renderer;
}

function renderMigrationNotice(
  overrides: Partial<MigrationNoticeProps> = {},
) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <GamificationRulesMigrationNotice
        summary={migrationSummary}
        locale="fr"
        onAcknowledged={vi.fn()}
        {...overrides}
      />,
    );
  });
  return renderer;
}

describe("Gamification interactive behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", { setTimeout: (callback: () => void) => { callback(); return 0; } });
    vi.stubGlobal("document", { getElementById: () => null });
  });

  it("acknowledges a reconciliation once despite a synchronous double click and preserves a real XP decrease", async () => {
    const request = deferred<{ ok: boolean }>();
    const fetchMock = vi.fn(() => request.promise);
    vi.stubGlobal("fetch", fetchMock);
    const onAcknowledged = vi.fn();
    const renderer = renderReconciliationNotice({ onAcknowledged });

    const acknowledge = findButton(renderer, "Compris");
    await act(async () => {
      await propsOf<ButtonProps>(acknowledge).onClick();
      await propsOf<ButtonProps>(acknowledge).onClick();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/gamification/me/acknowledge-reconciliation", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ notificationId: "notification-1" }),
    }));
    expect(renderer.root.findByProps({ children: "100 → 90 XP" })).toBeTruthy();
    expect(renderer.root.findByProps({ children: "Niveau 4 → Niveau 3" })).toBeTruthy();

    await act(async () => {
      request.resolve({ ok: true });
      await request.promise;
    });
    expect(onAcknowledged).toHaveBeenCalledOnce();
    renderer.unmount();
  });

  it("announces an acknowledgement failure while leaving the receipt visible for retry", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Service indisponible"));
    vi.stubGlobal("fetch", fetchMock);
    const renderer = renderReconciliationNotice();

    await act(async () => { await propsOf<ButtonProps>(findButton(renderer, "Compris")).onClick(); await Promise.resolve(); });
    expect(propsOf<AlertProps>(renderer.root.findByProps({ role: "alert" })).children).toBe("Service indisponible");
    expect(findButton(renderer, "Compris")).toBeTruthy();
    renderer.unmount();
  });

  it("shows the history recovery action and the unchanged state without inventing progression", () => {
    const historyReceipt = {
      ...reconciliation,
      unseenCount: 2,
      receipt: {
        ...reconciliation.receipt,
        xp: { before: 90, after: 90, delta: 0, gained: 0, removed: 0 },
        level: { before: 3, after: 3, changed: false, direction: "same" },
        hasUserVisibleChanges: true,
      },
    } as PendingGamificationReconciliation;
    const renderer = renderReconciliationNotice({ reconciliation: historyReceipt });

    expect(renderer.root.findByProps({ children: "2 mises à jour de progression non encore consultées." })).toBeTruthy();
    expect(renderer.root.findByProps({ children: "XP inchangée" })).toBeTruthy();
    expect(renderer.root.findByProps({ children: "Ouvrir l’historique" })).toBeTruthy();
    renderer.unmount();
  });

  it("does not render a progression notice when the authenticated progression is unavailable", () => {
    const renderer = renderReconciliationNotice({ progression: undefined });

    expect(renderer.toJSON()).toBeNull();
    renderer.unmount();
  });

  it("keeps a new mechanic explicit and prevents duplicate migration acknowledgement", async () => {
    const request = deferred<{ ok: boolean }>();
    const fetchMock = vi.fn(() => request.promise);
    vi.stubGlobal("fetch", fetchMock);
    const onAcknowledged = vi.fn();
    const renderer = renderMigrationNotice({ onAcknowledged });
    const acknowledge = findButton(renderer, "J’ai vu les nouveautés");

    await act(async () => {
      await propsOf<ButtonProps>(acknowledge).onClick();
      await propsOf<ButtonProps>(acknowledge).onClick();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/gamification/me/acknowledge-rules-migration", expect.objectContaining({ method: "POST" }));

    await act(async () => {
      request.resolve({ ok: true });
      await request.promise;
    });
    expect(onAcknowledged).toHaveBeenCalledOnce();
    renderer.unmount();
  });

  it("shows the migration error and remains retryable after a failed acknowledgement", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Service indisponible")));
    const renderer = renderMigrationNotice();

    await act(async () => {
      await propsOf<ButtonProps>(findButton(renderer, "J’ai vu les nouveautés")).onClick();
      await Promise.resolve();
    });
    expect(propsOf<AlertProps>(renderer.root.findByProps({ role: "alert" })).children).toBe("Service indisponible");
    expect(findButton(renderer, "J’ai vu les nouveautés")).toBeTruthy();
    renderer.unmount();
  });
});
