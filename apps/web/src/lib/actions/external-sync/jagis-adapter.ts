import { normalizeExternalActionEvent } from "./normalization";
import { assertSafeExternalSyncUrl } from "./url-guard";
import type { ExternalActionConnectorResult, ExternalActionEvent } from "./types";

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

export function normalizeJagisEvent(record: JagisEventRecord, observedAt: string): ExternalActionEvent | null {
  const normalized = normalizeExternalActionEvent({
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
  if (!normalized) return null;
  try {
    assertSafeExternalSyncUrl(normalized.externalUrl);
    if (normalized.registrationUrl) {
      assertSafeExternalSyncUrl(normalized.registrationUrl);
    }
  } catch {
    return null;
  }
  return normalized;
}

/**
 * Synthetic fixture reader for Lot A end-to-end verification without any live network call.
 */
export function readSyntheticJagisEvents(
  records: readonly JagisEventRecord[],
  observedAt: string,
  options: { complete?: boolean } = {},
): ExternalActionConnectorResult {
  const events: ExternalActionEvent[] = [];
  for (const record of records.slice(0, 100)) {
    const normalized = normalizeJagisEvent(record, observedAt);
    if (normalized) {
      events.push(normalized);
    }
  }
  return {
    status: "available",
    source: JAGIS_SOURCE_ID,
    events,
    complete: options.complete ?? true,
  };
}

/** No production reader is enabled until the operator authorizes an official source. */
export async function readJagisEvents(): Promise<ExternalActionConnectorResult> {
  return { status: "disabled", source: JAGIS_SOURCE_ID, reason: "operator_authorization_required" };
}
