import {
  buildCleanZonesBadges,
  buildParticipantBadges,
  EXPLORER_TIERS,
} from "./badges/families";
import { computeOrganisationProgress } from "./gem-progression";
import type {
  CurrentInfiniteProgressionId,
  GamificationBadgeReference,
  GamificationProgressionState,
  ProgressionEventType,
  ProgressionStatusPhase,
} from "./progression-types";
import {
  CURRENT_INFINITE_PROGRESSIONS,
  eventFamilyMap,
} from "./progression-utils";

export type TerrainProgressionId =
  | "participation"
  | "organisation"
  | "exploration"
  | "clean_zones";

export type TerrainProgressionEvent = {
  event_type: ProgressionEventType;
  status_phase: ProgressionStatusPhase;
  source_table: string;
  source_id: string;
  xp_awarded: number;
};

export type TerrainProgressionInputs = {
  participationCount: number;
  organisationCount: number;
  explorationCount: number;
  cleanZonesCount: number;
  events?: readonly TerrainProgressionEvent[];
};

function badgeReference(id: string, label: string): GamificationBadgeReference {
  return { id, label };
}

function buildTierState(
  progressionId: TerrainProgressionId,
  currentValue: number,
  badges: ReadonlyArray<{
    id: string;
    name: string;
    unlocked: boolean;
    progress: { target: number | null };
  }>,
): GamificationProgressionState {
  const safeCurrent = Math.max(0, Math.trunc(currentValue));
  const unlocked = badges.filter((badge) => badge.unlocked);
  const last = unlocked.at(-1) ?? badges[0];
  if (!last) {
    throw new Error(`No badge scale configured for ${progressionId}`);
  }

  const nextNamed = badges.find((badge) => !badge.unlocked);
  const lastThreshold = last.progress.target ?? 0;
  const lastLabel = last.name;
  const extensionIndex = nextNamed
    ? 0
    : Math.floor(Math.max(0, safeCurrent - lastThreshold) / 5);
  const currentThreshold = lastThreshold + extensionIndex * 5;
  const nextThreshold = nextNamed?.progress.target ?? currentThreshold + 5;
  const currentBadge = badgeReference(
    extensionIndex > 0 ? `${last.id}-${currentThreshold}` : last.id,
    lastLabel,
  );
  const nextBadge = nextNamed
    ? badgeReference(nextNamed.id, nextNamed.name)
    : badgeReference(`${last.id}-${nextThreshold}`, lastLabel);
  const progressStart = nextNamed ? Math.min(safeCurrent, lastThreshold) : currentThreshold;
  const progressSpan = Math.max(1, nextThreshold - progressStart);

  return {
    ...CURRENT_INFINITE_PROGRESSIONS.find((item) => item.id === progressionId)!,
    currentValue: safeCurrent,
    currentBadge,
    nextBadge,
    progressPercent: Math.round(
      (Math.max(0, Math.min(safeCurrent - progressStart, progressSpan)) /
        progressSpan) *
        100,
    ),
    xpContribution: 0,
  };
}

function buildOrganisationState(currentValue: number): GamificationProgressionState {
  const state = computeOrganisationProgress(currentValue);
  return {
    ...CURRENT_INFINITE_PROGRESSIONS.find((item) => item.id === "organisation")!,
    currentValue: Math.max(0, Math.trunc(currentValue)),
    currentBadge: badgeReference(state.currentGrade.id, state.currentLabel),
    nextBadge: state.nextGrade
      ? badgeReference(state.nextGrade.id, state.nextLabel ?? state.nextGrade.label)
      : null,
    progressPercent: state.progressPercent,
    xpContribution: 0,
  };
}

function buildExplorationState(currentValue: number): GamificationProgressionState {
  const current = Math.max(0, Math.trunc(currentValue));
  const currentTier =
    [...EXPLORER_TIERS].reverse().find((tier) => current >= tier.min) ?? EXPLORER_TIERS[0];
  const nextTier = EXPLORER_TIERS.find((tier) => tier.min > currentTier.min);
  const currentBadge = badgeReference(currentTier.id, currentTier.title);
  const extensionIndex = nextTier
    ? 0
    : Math.floor(Math.max(0, current - currentTier.min) / 5);
  const currentThreshold = currentTier.min + extensionIndex * 5;
  const nextThreshold = nextTier?.min ?? currentThreshold + 5;

  return {
    ...CURRENT_INFINITE_PROGRESSIONS.find((item) => item.id === "exploration")!,
    currentValue: current,
    currentBadge:
      extensionIndex > 0
        ? badgeReference(`${currentTier.id}-${currentThreshold}`, currentTier.title)
        : currentBadge,
    nextBadge: badgeReference(
      nextTier?.id ?? `${currentTier.id}-${nextThreshold}`,
      nextTier?.title ?? currentTier.title,
    ),
    progressPercent: Math.round(
      (Math.max(0, Math.min(current - currentThreshold, nextThreshold - currentThreshold)) /
        Math.max(1, nextThreshold - currentThreshold)) *
        100,
    ),
    xpContribution: 0,
  };
}

function buildProgressionXpContributions(
  events: readonly TerrainProgressionEvent[],
): Map<CurrentInfiniteProgressionId, number> {
  const families = eventFamilyMap();
  const contributions = new Map<CurrentInfiniteProgressionId, number>();
  const seen = new Set<string>();

  for (const event of events) {
    const identity = `${event.source_table}:${event.event_type}:${event.source_id}:${event.status_phase}`;
    if (seen.has(identity)) {
      continue;
    }
    seen.add(identity);

    if (event.status_phase === "rejected" || event.source_id === "first_trace_utile") {
      continue;
    }
    const family = families[event.event_type];
    if (!family) {
      continue;
    }
    contributions.set(
      family,
      (contributions.get(family) ?? 0) + Math.max(0, Number(event.xp_awarded) || 0),
    );
  }

  return contributions;
}

export function buildTerrainProgressions(
  input: TerrainProgressionInputs,
): Record<TerrainProgressionId, GamificationProgressionState> {
  const participation = buildTierState(
    "participation",
    input.participationCount,
    buildParticipantBadges(input.participationCount),
  );
  const exploration = buildExplorationState(input.explorationCount);
  const cleanZones = buildTierState(
    "clean_zones",
    input.cleanZonesCount,
    buildCleanZonesBadges(input.cleanZonesCount),
  );
  const states = {
    participation,
    organisation: buildOrganisationState(input.organisationCount),
    exploration,
    clean_zones: cleanZones,
  } satisfies Record<TerrainProgressionId, GamificationProgressionState>;
  const contributions = buildProgressionXpContributions(input.events ?? []);

  for (const state of Object.values(states)) {
    state.xpContribution = contributions.get(state.id) ?? 0;
  }

  return states;
}
