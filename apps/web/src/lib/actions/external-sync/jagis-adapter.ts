import { normalizeExternalActionEvent } from "./normalization";
import type { ExternalActionConnectorResult } from "./types";

export const JAGIS_SOURCE_ID = "jagis_pour_la_nature" as const;

export type JagisEventRecord = {
  id: unknown;
  url: unknown;
  title: unknown;
  description?: unknown;
  start_date: unknown;
  start_time?: unknown;
  end_time?: unknown;
  meeting_point?: unknown;
  city?: unknown;
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  activity_type?: unknown;
  registration_url?: unknown;
  route_reference?: unknown;
  cross_references?: unknown;
  updated_at?: unknown;
  status?: unknown;
};

export function normalizeJagisEvent(record: JagisEventRecord, observedAt: string) {
  return normalizeExternalActionEvent({
    source: JAGIS_SOURCE_ID,
    externalId: record.id,
    externalUrl: record.url,
    title: record.title,
    description: record.description,
    actionDate: record.start_date,
    startTime: record.start_time,
    endTime: record.end_time,
    meetingPoint: record.meeting_point,
    commune: record.city,
    address: record.address,
    latitude: record.latitude,
    longitude: record.longitude,
    activityType: record.activity_type,
    registrationUrl: record.registration_url,
    routeReference: record.route_reference,
    crossReferences: record.cross_references,
    sourceRevision: record.updated_at,
    observedAt,
    externalStatus: record.status,
  });
}

/** No production reader is enabled until the operator authorizes an official source. */
export async function readJagisEvents(): Promise<ExternalActionConnectorResult> {
  return { status: "disabled", source: JAGIS_SOURCE_ID, reason: "operator_authorization_required" };
}
