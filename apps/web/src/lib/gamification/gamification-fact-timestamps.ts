/**
 * Persisted reconstruction facts must not depend on the reconciliation run's
 * wall clock. The epoch date is the explicit fallback when no canonical
 * timestamp exists; aggregate proofs use stable source-row dates.
 */
const DETERMINISTIC_FALLBACK_OCCURRED_ON = "1970-01-01";

function occurredOnFrom(value: string | null | undefined): string {
  return value?.slice(0, 10) || DETERMINISTIC_FALLBACK_OCCURRED_ON;
}

function occurredOnAtThreshold<T>(
  rows: readonly T[],
  threshold: number,
  timestampOf: (row: T) => string | null | undefined,
): string {
  const timestamps = rows.map(timestampOf).filter(Boolean).map((value) => occurredOnFrom(value)).sort();
  return timestamps[threshold - 1] ?? DETERMINISTIC_FALLBACK_OCCURRED_ON;
}

function latestOccurredOn<T>(
  rows: readonly T[],
  timestampOf: (row: T) => string | null | undefined,
): string {
  return rows.map(timestampOf).filter(Boolean).map((value) => occurredOnFrom(value)).sort().at(-1)
    ?? DETERMINISTIC_FALLBACK_OCCURRED_ON;
}

export {
  DETERMINISTIC_FALLBACK_OCCURRED_ON,
  latestOccurredOn,
  occurredOnAtThreshold,
  occurredOnFrom,
};
