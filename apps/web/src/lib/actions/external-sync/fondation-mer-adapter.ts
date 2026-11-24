import { normalizeExternalActionEvent } from "./normalization";
import type { ExternalActionConnectorResult } from "./types";

export const FONDATION_MER_SOURCE_ID = "fondation_de_la_mer" as const;

export type FondationMerEventRecord = {
  reference: unknown;
  canonical_url: unknown;
  name: unknown;
  details?: unknown;
  date: unknown;
  time_start?: unknown;
  time_end?: unknown;
  meeting_place?: unknown;
  municipality?: unknown;
  street_address?: unknown;
  lat?: unknown;
  lng?: unknown;
  event_kind?: unknown;
  booking_url?: unknown;
  route_name?: unknown;
  related_events?: unknown;
  revision?: unknown;
  state?: unknown;
};

export function normalizeFondationMerEvent(record: FondationMerEventRecord, observedAt: string) {
  return normalizeExternalActionEvent({
    source: FONDATION_MER_SOURCE_ID,
    externalId: record.reference,
    externalUrl: record.canonical_url,
    title: record.name,
    description: record.details,
    actionDate: record.date,
    startTime: record.time_start,
    endTime: record.time_end,
    meetingPoint: record.meeting_place,
    commune: record.municipality,
    address: record.street_address,
    latitude: record.lat,
    longitude: record.lng,
    activityType: record.event_kind,
    registrationUrl: record.booking_url,
    routeReference: record.route_name,
    crossReferences: record.related_events,
    sourceRevision: record.revision,
    observedAt,
    externalStatus: record.state,
  });
}

/** No production reader is enabled until the operator authorizes an official source. */
export async function readFondationMerEvents(): Promise<ExternalActionConnectorResult> {
  return { status: "disabled", source: FONDATION_MER_SOURCE_ID, reason: "operator_authorization_required" };
}
