import type { SpogomiEventState } from "./types";

export type SpogomiCalendarStatus = "upcoming" | "in_progress" | "finished" | "cancelled" | "postponed";
export type SpogomiRegistrationStatus = "not_open" | "open" | "closed" | "capacity_reached";
export type SpogomiResultsStatus = "unavailable" | "provisional" | "certified" | "published";

export type SpogomiLifecycleProjection = {
  calendar: SpogomiCalendarStatus;
  registration: SpogomiRegistrationStatus;
  results: SpogomiResultsStatus;
};

function parseInstant(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Calendar is deliberately independent from the business state. A certified
 * event with a future date remains upcoming, and an ended event is not made
 * certified merely because its dates have elapsed.
 */
export function classifySpogomiCalendarStatus(input: {
  startsAt: string;
  endsAt: string | null;
  state: SpogomiEventState | string;
  now?: Date;
  postponedProof?: boolean;
}): SpogomiCalendarStatus {
  if (input.state === "cancelled") return "cancelled";
  if (input.postponedProof === true) return "postponed";

  const now = (input.now ?? new Date()).getTime();
  const start = parseInstant(input.startsAt);
  const end = input.endsAt ? parseInstant(input.endsAt) : null;
  if (end !== null && now >= end) return "finished";
  if (start !== null && now >= start) return "in_progress";
  return "upcoming";
}

export function classifySpogomiRegistrationStatus(input: {
  state: SpogomiEventState | string;
  registeredCount: number;
  capacity: number | null;
}): SpogomiRegistrationStatus {
  if (input.capacity !== null && input.registeredCount >= input.capacity) return "capacity_reached";
  if (input.state === "registration_open") return "open";
  if (input.state === "draft") return "not_open";
  return "closed";
}

export function classifySpogomiResultsStatus(input: {
  publicVisibility: "private" | "published";
  publicResultsVisibility: "hidden" | "provisional" | "certified";
  hasProvisionalResults: boolean;
  hasCertifiedResults: boolean;
}): SpogomiResultsStatus {
  if (!input.hasProvisionalResults && !input.hasCertifiedResults) return "unavailable";
  if (input.hasCertifiedResults) {
    return input.publicVisibility === "published" && input.publicResultsVisibility === "certified"
      ? "published"
      : "certified";
  }
  return input.publicVisibility === "published" && input.publicResultsVisibility === "provisional"
    ? "provisional"
    : "unavailable";
}

export function combineSpogomiResultsStatuses(statuses: readonly SpogomiResultsStatus[]): SpogomiResultsStatus {
  if (!statuses.length || statuses.every((status) => status === "unavailable")) return "unavailable";
  if (statuses.every((status) => status === "published")) return "published";
  if (statuses.every((status) => status === "published" || status === "certified")) return "certified";
  if (statuses.some((status) => status === "provisional" || status === "certified" || status === "published")) return "provisional";
  return "unavailable";
}

export function buildSpogomiLifecycleProjection(input: {
  startsAt: string;
  endsAt: string | null;
  state: SpogomiEventState | string;
  registeredCount: number;
  capacity: number | null;
  publicVisibility: "private" | "published";
  publicResultsVisibility: "hidden" | "provisional" | "certified";
  hasProvisionalResults: boolean;
  hasCertifiedResults: boolean;
  now?: Date;
  postponedProof?: boolean;
}): SpogomiLifecycleProjection {
  return {
    calendar: classifySpogomiCalendarStatus(input),
    registration: classifySpogomiRegistrationStatus(input),
    results: classifySpogomiResultsStatus(input),
  };
}
