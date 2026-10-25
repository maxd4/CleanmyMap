import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readAllSpogomiPages } from "./pagination";
import type { SpogomiCollection, SpogomiCollectionAward } from "./collection";
import { loadSpogomiCollectionForUser } from "./recognition-service";
import type { SpogomiRecognitionKind } from "./recognition";
import { formatCivilDateInTimeZone } from "@/lib/time/civil-date";

type Row = Record<string, unknown>;

const SPOGOMI_VOLUNTEER_MISSION_KINDS: readonly SpogomiRecognitionKind[] = [
  "collector", "referee", "organizer", "finish_control", "field_safety", "weighing_sorting", "logistics_support",
];

export type SpogomiVolunteerMission = {
  id: string;
  eventId: string;
  divisionId?: string;
  eventName: string;
  locationLabel: string;
  eventDate: string;
  kind: SpogomiRecognitionKind;
  status: "certified" | "revoked";
  certifiedAt: string | null;
  evidenceReference: string;
  certificationVersion: string;
};

export type SpogomiVolunteerEvent = {
  eventId: string;
  divisionId?: string | null;
  eventName: string;
  eventSlug: string | null;
  eventPublic: boolean;
  locationLabel: string;
  eventDate: string;
  eventState: string;
  participantId: string | null;
  identityVerified: boolean;
  attendanceStatus: "unknown" | "present" | "absent" | null;
  actionParticipationConfirmed: boolean;
  missions: SpogomiVolunteerMission[];
};

export type SpogomiVolunteerCertificate = {
  id: string;
  certificateReference: string;
  userId: string;
  eventId: string;
  divisionId?: string | null;
  sourceFingerprint: string;
  sourceSnapshot: { event: Omit<SpogomiVolunteerEvent, "missions">; missions: SpogomiVolunteerMission[] };
  status: "active" | "revoked" | "replaced";
  issuedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
};

export type SpogomiVolunteerSummary = {
  confirmedEventCount: number;
  certifiedMissionCount: number;
  certifiedRefereeOrganizerMissionCount: number;
  chronology: SpogomiVolunteerEvent[];
  certificates: SpogomiVolunteerCertificate[];
  awards: SpogomiCollectionAward[];
  collection: SpogomiCollection;
};

export type SpogomiVolunteerContributionStatus =
  | "identity_unlinked"
  | "presence_not_confirmed"
  | "validation_pending"
  | "certificate_available"
  | "certificate_reissue_available"
  | "certificate_current"
  | "certificate_revoked";

function localDate(startsAt: string, timezone: string): string {
  try {
    return formatCivilDateInTimeZone(startsAt, timezone);
  } catch {
    return startsAt.slice(0, 10);
  }
}

function isRecord(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVolunteerMissionKind(value: unknown): value is SpogomiRecognitionKind {
  return value === "collector" || value === "referee" || value === "organizer" || value === "finish_control" || value === "field_safety" || value === "weighing_sorting" || value === "logistics_support";
}

function parseVolunteerSourceSnapshot(value: unknown): SpogomiVolunteerCertificate["sourceSnapshot"] {
  if (!isRecord(value) || !isRecord(value.event) || !Array.isArray(value.missions)) throw new Error("La source du certificat bénévole SPOGOMI est invalide.");
  const event = value.event;
  if (typeof event.eventId !== "string" || (event.divisionId !== undefined && event.divisionId !== null && typeof event.divisionId !== "string") ||
    typeof event.eventName !== "string" || (event.eventSlug !== null && typeof event.eventSlug !== "string") || typeof event.eventPublic !== "boolean" ||
    typeof event.locationLabel !== "string" || typeof event.eventDate !== "string" || typeof event.eventState !== "string" ||
    (event.participantId !== null && typeof event.participantId !== "string") || typeof event.identityVerified !== "boolean" ||
    (event.attendanceStatus !== null && event.attendanceStatus !== "unknown" && event.attendanceStatus !== "present" && event.attendanceStatus !== "absent") ||
    typeof event.actionParticipationConfirmed !== "boolean") throw new Error("La source du certificat bénévole SPOGOMI est invalide.");
  const missions = value.missions.map((mission): SpogomiVolunteerMission => {
    if (!isRecord(mission) || typeof mission.id !== "string" || typeof mission.eventId !== "string" ||
      (mission.divisionId !== undefined && typeof mission.divisionId !== "string") || typeof mission.eventName !== "string" ||
      typeof mission.locationLabel !== "string" || typeof mission.eventDate !== "string" ||
      !isVolunteerMissionKind(mission.kind) ||
      (mission.status !== "certified" && mission.status !== "revoked") ||
      (mission.certifiedAt !== null && typeof mission.certifiedAt !== "string") || typeof mission.evidenceReference !== "string" ||
      typeof mission.certificationVersion !== "string") throw new Error("La source du certificat bénévole SPOGOMI est invalide.");
    return {
      id: mission.id,
      eventId: mission.eventId,
      ...(typeof mission.divisionId === "string" ? { divisionId: mission.divisionId } : {}),
      eventName: mission.eventName,
      locationLabel: mission.locationLabel,
      eventDate: mission.eventDate,
      kind: mission.kind,
      status: mission.status,
      certifiedAt: mission.certifiedAt,
      evidenceReference: mission.evidenceReference,
      certificationVersion: mission.certificationVersion,
    };
  });
  return {
    event: {
      eventId: event.eventId,
      divisionId: event.divisionId,
      eventName: event.eventName,
      eventSlug: event.eventSlug,
      eventPublic: event.eventPublic,
      locationLabel: event.locationLabel,
      eventDate: event.eventDate,
      eventState: event.eventState,
      participantId: event.participantId,
      identityVerified: event.identityVerified,
      attendanceStatus: event.attendanceStatus,
      actionParticipationConfirmed: event.actionParticipationConfirmed,
    },
    missions,
  };
}

async function loadVolunteerEvents(supabase: SupabaseClient, userId: string, eventId?: string): Promise<SpogomiVolunteerEvent[]> {
  const participants = await readAllSpogomiPages("private SPOGOMI volunteer participants", (from, to) => {
    let query = supabase.from("spogomi_participants")
      .select("id, event_id, division_id, clerk_id, registration_status, attendance_status, account_link_status", { count: "exact" })
      .eq("clerk_id", userId);
    if (eventId) query = query.eq("event_id", eventId);
    return query.range(from, to);
  }, { requireExactCount: true });
  const participantRows = participants as Row[];
  if (!participantRows.length) return [];
  const eventIds = [...new Set(participantRows.map((participant) => String(participant.event_id)))];
  const [events, attestations, actionParticipants] = await Promise.all([
    readAllSpogomiPages("private SPOGOMI volunteer events", (from, to) => supabase.from("spogomi_events").select("id, action_id, name, location_label, event_slug, public_visibility, starts_at, official_timezone, state", { count: "exact" })
      .in("id", eventIds).order("starts_at", { ascending: false }).range(from, to), { requireExactCount: true }),
    readAllSpogomiPages("private SPOGOMI volunteer attestations", (from, to) => supabase.from("spogomi_recognition_attestations")
      .select("id, event_id, division_id, participant_id, kind, status, certified_at, evidence_reference, certification_version", { count: "exact" })
      .in("event_id", eventIds).in("kind", [...SPOGOMI_VOLUNTEER_MISSION_KINDS]).range(from, to), { requireExactCount: true }),
    readAllSpogomiPages("private SPOGOMI confirmed action participation", (from, to) => supabase.from("action_participants")
      .select("id, action_id, participation_status", { count: "exact" }).eq("user_id", userId).eq("participation_status", "confirmed")
      .range(from, to), { requireExactCount: true }),
  ]);
  const participantByEvent = new Map(participantRows.map((participant) => [String(participant.event_id), participant]));
  const confirmedActionIds = new Set((actionParticipants as Row[]).map((row) => String(row.action_id)));
  const attestationsByParticipant = new Map<string, Row[]>();
  for (const attestation of attestations as Row[]) {
    const key = String(attestation.participant_id);
    attestationsByParticipant.set(key, [...(attestationsByParticipant.get(key) ?? []), attestation]);
  }
  return events.map((event) => {
    const eventIdValue = String(event.id);
    const participant = participantByEvent.get(eventIdValue);
    const actionConfirmed = Boolean(participant && confirmedActionIds.has(String(event.action_id)));
    const missions = (participant ? attestationsByParticipant.get(String(participant.id)) ?? [] : [])
      .map((row): SpogomiVolunteerMission => ({
        id: String(row.id), eventId: eventIdValue, divisionId: row.division_id ? String(row.division_id) : undefined, eventName: String(event.name), locationLabel: String(event.location_label),
        eventDate: localDate(String(event.starts_at), String(event.official_timezone ?? "Europe/Paris")),
        kind: String(row.kind) as SpogomiRecognitionKind, status: String(row.status) as "certified" | "revoked",
        certifiedAt: row.certified_at ? String(row.certified_at) : null, evidenceReference: String(row.evidence_reference),
        certificationVersion: String(row.certification_version),
      }))
      .sort((left, right) => `${left.eventDate}:${left.id}`.localeCompare(`${right.eventDate}:${right.id}`));
    return {
      eventId: eventIdValue, divisionId: participant?.division_id ? String(participant.division_id) : null, eventName: String(event.name), locationLabel: String(event.location_label),
      eventSlug: event.event_slug ? String(event.event_slug) : null, eventPublic: event.public_visibility === "published",
      eventDate: localDate(String(event.starts_at), String(event.official_timezone ?? "Europe/Paris")), eventState: String(event.state),
      participantId: participant ? String(participant.id) : null,
      identityVerified: participant?.account_link_status === "verified" && String(participant.clerk_id) === userId,
      attendanceStatus: participant ? String(participant.attendance_status) as SpogomiVolunteerEvent["attendanceStatus"] : null,
      actionParticipationConfirmed: actionConfirmed,
      missions,
    };
  });
}

function certifiedMissions(event: SpogomiVolunteerEvent): SpogomiVolunteerMission[] {
  return event.missions.filter((mission) => mission.status === "certified" && mission.evidenceReference.trim().length > 0);
}

export function resolveSpogomiVolunteerContributionStatus({
  event,
  certifiedMissions: missions,
  currentFingerprint,
  latestCertificate,
}: {
  event: Pick<SpogomiVolunteerEvent, "identityVerified" | "attendanceStatus" | "actionParticipationConfirmed">;
  certifiedMissions: SpogomiVolunteerMission[];
  currentFingerprint: string | null;
  latestCertificate: { status: SpogomiVolunteerCertificate["status"]; source_fingerprint: string } | null;
}): SpogomiVolunteerContributionStatus {
  if (!event.identityVerified) return "identity_unlinked";
  if (event.attendanceStatus !== "present" || !event.actionParticipationConfirmed) return "presence_not_confirmed";
  if (!missions.length) return latestCertificate ? "certificate_revoked" : "validation_pending";
  if (latestCertificate?.status === "active" && latestCertificate.source_fingerprint === currentFingerprint) return "certificate_current";
  if (latestCertificate) return "certificate_reissue_available";
  return "certificate_available";
}

export async function loadSpogomiVolunteerEventForUser(supabase: SupabaseClient, userId: string, eventId: string): Promise<SpogomiVolunteerEvent | null> {
  return (await loadVolunteerEvents(supabase, userId, eventId))[0] ?? null;
}

export async function loadSpogomiVolunteerSummaryForUser(supabase: SupabaseClient, userId: string): Promise<SpogomiVolunteerSummary> {
  const chronology = await loadVolunteerEvents(supabase, userId);
  const collection = await loadSpogomiCollectionForUser(supabase, userId);
  const certificatesResult = await supabase.from("spogomi_volunteer_certificates")
    .select("id, certificate_reference, user_id, event_id, division_id, source_fingerprint, source_snapshot, status, issued_at, revoked_at, revocation_reason")
    .eq("user_id", userId).order("issued_at", { ascending: false });
  if (certificatesResult.error) throw certificatesResult.error;
  const certificates = (certificatesResult.data ?? []).map(mapCertificate);
  const confirmedEvents = chronology.filter((event) => event.eventState === "certified" && event.identityVerified && event.attendanceStatus === "present" && event.actionParticipationConfirmed);
  const missions = chronology.flatMap(certifiedMissions);
  return {
    confirmedEventCount: new Set(confirmedEvents.map((event) => event.eventId)).size,
    certifiedMissionCount: missions.length,
    certifiedRefereeOrganizerMissionCount: missions.filter((mission) => mission.kind === "referee" || mission.kind === "organizer").length,
    chronology,
    certificates,
    awards: collection.awards,
    collection,
  };
}

function mapCertificate(value: unknown): SpogomiVolunteerCertificate {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.certificate_reference !== "string" || typeof value.user_id !== "string" ||
    typeof value.event_id !== "string" || (value.division_id !== null && typeof value.division_id !== "string") || typeof value.source_fingerprint !== "string" ||
    (value.status !== "active" && value.status !== "revoked" && value.status !== "replaced") || typeof value.issued_at !== "string" ||
    (value.revoked_at !== null && typeof value.revoked_at !== "string") || (value.revocation_reason !== null && typeof value.revocation_reason !== "string")) {
    throw new Error("La réponse de certificat bénévole SPOGOMI est invalide.");
  }
  return {
    id: value.id, certificateReference: value.certificate_reference, userId: value.user_id, eventId: value.event_id, divisionId: value.division_id,
    sourceFingerprint: value.source_fingerprint, sourceSnapshot: parseVolunteerSourceSnapshot(value.source_snapshot),
    status: value.status, issuedAt: value.issued_at,
    revokedAt: value.revoked_at, revocationReason: value.revocation_reason,
  };
}

export function buildSpogomiVolunteerSourceFingerprint(event: SpogomiVolunteerEvent, missions: SpogomiVolunteerMission[]): string {
  return createHash("sha256").update(JSON.stringify({
    event: { eventId: event.eventId, divisionId: event.divisionId ?? null, eventName: event.eventName, locationLabel: event.locationLabel, eventDate: event.eventDate },
    missions: missions.map((mission) => ({ id: mission.id, divisionId: mission.divisionId ?? null, kind: mission.kind, status: mission.status, certifiedAt: mission.certifiedAt, evidenceReference: mission.evidenceReference, certificationVersion: mission.certificationVersion })),
  }), "utf8").digest("hex");
}

export async function issueSpogomiVolunteerCertificate(supabase: SupabaseClient, userId: string, eventId: string): Promise<SpogomiVolunteerCertificate> {
  const event = await loadSpogomiVolunteerEventForUser(supabase, userId, eventId);
  const missions = event ? certifiedMissions(event) : [];
  if (!event || event.eventState !== "certified" || !event.identityVerified || event.attendanceStatus !== "present" || !event.actionParticipationConfirmed) {
    throw new Error("Validation: la participation bénévole certifiée n’est pas disponible.");
  }
  if (!missions.length) {
    await revokeSpogomiVolunteerCertificate(supabase, userId, eventId, "La source certifiée ne contient plus de mission bénévole active.");
    throw new Error("Validation: aucune mission bénévole certifiée n’est disponible.");
  }
  const fingerprint = buildSpogomiVolunteerSourceFingerprint(event, missions);
  const result = await supabase.rpc("issue_spogomi_volunteer_certificate", {
    p_user_id: userId, p_event_id: eventId, p_source_fingerprint: fingerprint,
    p_source_snapshot: { event: { ...event, missions: undefined }, missions }, p_actor_clerk_id: userId,
  });
  if (result.error) throw result.error;
  const row: unknown = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new Error("La référence de certificat SPOGOMI n’a pas été créée.");
  return mapCertificate(row);
}

export async function revokeSpogomiVolunteerCertificate(supabase: SupabaseClient, userId: string, eventId: string, reason: string): Promise<void> {
  const result = await supabase.rpc("revoke_spogomi_volunteer_certificate", { p_user_id: userId, p_event_id: eventId, p_reason: reason, p_actor_clerk_id: userId });
  if (result.error) throw result.error;
}

export async function loadSpogomiCertificateForUser(supabase: SupabaseClient, userId: string, certificateReference: string): Promise<SpogomiVolunteerCertificate | null> {
  const result = await supabase.from("spogomi_volunteer_certificates")
    .select("id, certificate_reference, user_id, event_id, division_id, source_fingerprint, source_snapshot, status, issued_at, revoked_at, revocation_reason")
    .eq("user_id", userId).eq("certificate_reference", certificateReference).maybeSingle();
  if (result.error) throw result.error;
  return result.data ? mapCertificate(result.data) : null;
}
