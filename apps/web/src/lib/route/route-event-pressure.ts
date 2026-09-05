import { routeDistanceKm } from "./route-planner";

export const ROUTE_EVENT_RECENT_WINDOW_DAYS = 16;
export const ROUTE_EVENT_SIGNAL_HORIZON_DAYS = 56;
export const ROUTE_EVENT_SPATIAL_RADIUS_KM = 2;
export const ROUTE_EVENT_MAX_SCORE_BOOST = 20;

const DAY_MS = 86_400_000;
const MAX_ATTENDANCE_PROXY = 12;

export type RouteEventCandidateLocation = {
  id: string;
  latitude: number;
  longitude: number;
};

export type RouteEventRecord = {
  id: string;
  title: string;
  eventDate: string;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
};

export type RouteEventAttendance = {
  yes: number;
  maybe: number;
  no: number;
  capacityTarget: number | null;
};

export type RouteEventPressureContribution = {
  eventId: string;
  title: string;
  eventDate: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  ageDays: number;
  distanceKm: number;
  recencyFactor: number;
  proximityFactor: number;
  attendanceFactor: number;
  attendanceEvidence: {
    yes: number;
    maybe: number;
    capacityTarget: number | null;
    known: boolean;
  };
  pressure: number;
  scoreContribution: number;
};

export type RouteEventCandidatePressure = {
  combinedPressure: number;
  scoreBoost: number;
  contributions: RouteEventPressureContribution[];
};

export type RouteEventSignalContext = {
  candidatePressureById: Map<string, RouteEventCandidatePressure>;
  completedEventsConsidered: number;
  geolocatedCompletedEvents: number;
  eventsWithoutCoordinates: number;
  futureEventSignals: string[];
  sourceAvailable: boolean;
  warnings: string[];
};

const EMPTY_ATTENDANCE: RouteEventAttendance = {
  yes: 0,
  maybe: 0,
  no: 0,
  capacityTarget: null,
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}
export function isValidRouteEventCoordinatePair(
  latitude: number | null,
  longitude: number | null,
): boolean {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function parseEventDate(eventDate: string): number | null {
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(eventDate)
      ? `${eventDate}T00:00:00.000Z`
      : eventDate,
  ).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function routeEventAgeDays(eventDate: string, now: Date): number | null {
  const eventTime = parseEventDate(eventDate);
  if (eventTime === null) return null;
  const ageDays = (now.getTime() - eventTime) / DAY_MS;
  return ageDays >= 0 ? ageDays : null;
}

export function routeEventRecencyFactor(ageDays: number): number {
  if (!Number.isFinite(ageDays) || ageDays < 0) return 0;
  if (ageDays <= ROUTE_EVENT_RECENT_WINDOW_DAYS) {
    return 1 - 0.5 * (ageDays / ROUTE_EVENT_RECENT_WINDOW_DAYS);
  }
  if (ageDays >= ROUTE_EVENT_SIGNAL_HORIZON_DAYS) return 0;
  return (
    0.5 *
    ((ROUTE_EVENT_SIGNAL_HORIZON_DAYS - ageDays) /
      (ROUTE_EVENT_SIGNAL_HORIZON_DAYS - ROUTE_EVENT_RECENT_WINDOW_DAYS))
  );
}

export function routeEventProximityFactor(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 0;
  return clamp(1 - distanceKm / ROUTE_EVENT_SPATIAL_RADIUS_KM);
}

function attendanceFactor(attendance: RouteEventAttendance): {
  factor: number;
  known: boolean;
} {
  const yes = Math.max(0, attendance.yes);
  const maybe = Math.max(0, attendance.maybe);
  const capacity =
    attendance.capacityTarget === null
      ? 0
      : Math.min(MAX_ATTENDANCE_PROXY, Math.max(0, attendance.capacityTarget) / 6);
  const proxy = Math.min(MAX_ATTENDANCE_PROXY, yes + maybe * 0.5 + capacity);
  return {
    factor: 0.5 + 0.5 * (proxy / MAX_ATTENDANCE_PROXY),
    known: yes > 0 || maybe > 0 || attendance.capacityTarget !== null,
  };
}

export function calculateRouteEventPressure(
  event: RouteEventRecord,
  candidate: RouteEventCandidateLocation,
  attendance: RouteEventAttendance,
  now: Date,
): RouteEventPressureContribution | null {
  if (!isValidRouteEventCoordinatePair(event.latitude, event.longitude)) return null;
  const ageDays = routeEventAgeDays(event.eventDate, now);
  if (ageDays === null || ageDays >= ROUTE_EVENT_SIGNAL_HORIZON_DAYS) return null;
  const latitude = event.latitude;
  const longitude = event.longitude;
  if (latitude === null || longitude === null) return null;
  const distanceKm = routeDistanceKm({ latitude, longitude }, candidate);
  const recencyFactor = routeEventRecencyFactor(ageDays);
  const proximityFactor = routeEventProximityFactor(distanceKm);
  const attendanceMetrics = attendanceFactor(attendance);
  const pressure = clamp(recencyFactor * proximityFactor * attendanceMetrics.factor);
  if (pressure <= 0) return null;
  return {
    eventId: event.id,
    title: event.title,
    eventDate: event.eventDate,
    locationLabel: event.locationLabel,
    latitude,
    longitude,
    ageDays,
    distanceKm,
    recencyFactor,
    proximityFactor,
    attendanceFactor: attendanceMetrics.factor,
    attendanceEvidence: {
      yes: Math.max(0, attendance.yes),
      maybe: Math.max(0, attendance.maybe),
      capacityTarget: attendance.capacityTarget,
      known: attendanceMetrics.known,
    },
    pressure,
    scoreContribution: pressure * ROUTE_EVENT_MAX_SCORE_BOOST,
  };
}

export function combineRouteEventPressures(
  contributions: RouteEventPressureContribution[],
): RouteEventCandidatePressure {
  const ordered = [...contributions].sort((left, right) =>
    left.eventId.localeCompare(right.eventId),
  );
  const combinedPressure = clamp(
    1 - ordered.reduce((remaining, contribution) => remaining * (1 - contribution.pressure), 1),
  );
  return {
    combinedPressure,
    scoreBoost: combinedPressure * ROUTE_EVENT_MAX_SCORE_BOOST,
    contributions: ordered,
  };
}

export function buildRouteEventPressureByCandidate(
  events: RouteEventRecord[],
  attendanceByEventId: ReadonlyMap<string, RouteEventAttendance>,
  candidates: RouteEventCandidateLocation[],
  now: Date,
): Map<string, RouteEventCandidatePressure> {
  const result = new Map<string, RouteEventCandidatePressure>();
  for (const candidate of candidates) {
    const contributions = events
      .map((event) =>
        calculateRouteEventPressure(
          event,
          candidate,
          attendanceByEventId.get(event.id) ?? EMPTY_ATTENDANCE,
          now,
        ),
      )
      .filter(
        (contribution): contribution is RouteEventPressureContribution =>
          contribution !== null,
      );
    if (contributions.length > 0) {
      result.set(candidate.id, combineRouteEventPressures(contributions));
   }
 }
 return result;
}
