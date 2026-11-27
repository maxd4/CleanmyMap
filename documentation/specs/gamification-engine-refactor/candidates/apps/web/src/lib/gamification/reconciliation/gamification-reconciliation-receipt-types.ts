export type GamificationReconciliationReasonCategory =
  | "rules_update"
  | "data_correction"
  | "account_rebuild"
  | "migration"
  | "scientific_impact_update"
  | "other";

type GamificationReceiptId = { id: string };

export type GamificationProgressionReceiptState = {
  badgeIds: string[];
  thresholds: number[];
  eventCount: number;
};

export type GamificationProgressionReceiptChange = {
  id: string;
  before: GamificationProgressionReceiptState;
  after: GamificationProgressionReceiptState;
};

export type GamificationBadgeReceiptChange = {
  id: string;
  progressionId?: string;
};

export type GamificationBadgeUpgrade = {
  from: GamificationBadgeReceiptChange;
  to: GamificationBadgeReceiptChange;
};

export type GamificationReconciliationReceipt = {
  reconciliationId: string;
  userId: string;
  occurredAt: string;
  previousRulesVersion: string | null | "mixed";
  currentRulesVersion: string;
  previousRulesRevision: number | null;
  currentRulesRevision: number;
  xp: {
    before: number;
    after: number;
    delta: number;
    gained: number;
    removed: number;
  };
  level: {
    before: number | null;
    after: number | null;
    changed: boolean;
    direction: "up" | "down" | "same";
  };
  progressions: {
    added: GamificationReceiptId[];
    removed: GamificationReceiptId[];
    changed: GamificationProgressionReceiptChange[];
  };
  badges: {
    unlocked: GamificationBadgeReceiptChange[];
    removed: GamificationBadgeReceiptChange[];
    upgraded: GamificationBadgeUpgrade[];
    downgraded: GamificationBadgeUpgrade[];
  };
  milestones: {
    unlocked: GamificationReceiptId[];
    removed: GamificationReceiptId[];
  };
  eventChanges: {
    addedCount: number;
    updatedCount: number;
    removedCount: number;
  };
  catalogChanges: {
    newProgressionIds: string[];
    newMilestoneIds: string[];
    retiredMechanicIds: string[];
  };
  scientificImpact?: {
    methodVersion: string;
    sourceFingerprint: string;
    eventsAdded: number;
    eventsUpdated: number;
    eventsRemoved: number;
  };
  reasonCategory: GamificationReconciliationReasonCategory;
  hasUserVisibleChanges: boolean;
};

export type ScientificImpactReceiptIntent = {
  kind: "scientific_impact_reconciliation_pending";
  schemaVersion: 1;
  reconciliationId: string;
  userId: string;
  scientificImpact: {
    methodVersion: string;
    sourceFingerprint: string;
    eventsAdded: number;
    eventsUpdated: number;
    eventsRemoved: number;
  };
};
