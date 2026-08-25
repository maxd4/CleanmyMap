const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const ACTION_REVISIT_PRIORITY_CONSTANTS = {
  graceDays: 30,
  malusPerAdditionalDay: 0.1,
  maxMalus: 30,
  maxPriority: 100,
} as const;

export type ActionRevisitPriorityPresentation = {
  observedScore: number;
  observationAgeDays: number;
  freshnessMalus: number;
  revisitPriority: number;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(ACTION_REVISIT_PRIORITY_CONSTANTS.maxPriority, value),
  );
}

function toTimestamp(value: string | Date | number): number | null {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function resolveObservationAgeDays(
  observedAt: string | Date | number,
  now: string | Date | number = new Date(),
): number {
  const observedTimestamp = toTimestamp(observedAt);
  const nowTimestamp = toTimestamp(now);

  if (observedTimestamp === null || nowTimestamp === null) {
    return 0;
  }

  return Math.max(0, Math.floor((nowTimestamp - observedTimestamp) / MS_PER_DAY));
}

export function presentActionRevisitPriority(
  observedScore: number,
  observedAt: string | Date | number,
  now: string | Date | number = new Date(),
): ActionRevisitPriorityPresentation {
  const normalizedObservedScore = clampScore(observedScore);
  const observationAgeDays = resolveObservationAgeDays(observedAt, now);
  const additionalDays = Math.max(
    0,
    observationAgeDays - ACTION_REVISIT_PRIORITY_CONSTANTS.graceDays,
  );
  const freshnessMalus = Math.min(
    ACTION_REVISIT_PRIORITY_CONSTANTS.maxMalus,
    additionalDays * ACTION_REVISIT_PRIORITY_CONSTANTS.malusPerAdditionalDay,
  );

  return {
    observedScore: normalizedObservedScore,
    observationAgeDays,
    freshnessMalus,
    revisitPriority: Math.min(
      ACTION_REVISIT_PRIORITY_CONSTANTS.maxPriority,
      normalizedObservedScore + freshnessMalus,
    ),
  };
}
