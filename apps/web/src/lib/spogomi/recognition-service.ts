import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCurrentGamificationFacts } from "@/lib/gamification/gamification-facts-loader";
import { reconcileUserGamification } from "@/lib/gamification/gamification-reconciliation";
import type { GamificationFacts } from "@/lib/gamification/gamification-reconstruction";
import {
  buildSpogomiRecognitionProjection,
  type SpogomiAward,
  type SpogomiMissionProof,
  type SpogomiOfficialRanking,
  type SpogomiRecognitionParticipant,
} from "./recognition";
import { readAllSpogomiPages } from "./pagination";
import { buildSpogomiSpecializedProgress } from "./progress";
import type { SpogomiCollection, SpogomiCollectionAward } from "./collection";
import { logFailure } from "@/lib/logging/failure-log";

type EventRow = { id: string; action_id: string; name: string; event_slug: string | null; starts_at: string; official_timezone: string; state: string; public_visibility: string };

class SpogomiRecognitionPartialError extends Error {
  readonly code = "SPOGOMI_RECOGNITION_PARTIAL";
  readonly eventId: string;
  readonly affectedUserCount: number;
  readonly gamificationReconciledUserCount: number;
  readonly retryable = true;

  constructor(params: { eventId: string; affectedUserCount: number; gamificationReconciledUserCount: number; cause: unknown }) {
    super("La projection des distinctions SPOGOMI a été enregistrée, mais la réconciliation XP est partielle et doit être rejouée.", { cause: params.cause });
    this.name = "SpogomiRecognitionPartialError";
    this.eventId = params.eventId;
    this.affectedUserCount = params.affectedUserCount;
    this.gamificationReconciledUserCount = params.gamificationReconciledUserCount;
  }
}

export function getSpogomiRecognitionPartialDetails(error: unknown) {
  if (!(error instanceof SpogomiRecognitionPartialError)) return null;
  return {
    status: "partial" as const,
    eventId: error.eventId,
    badgesMutationApplied: true,
    gamificationReconciledUserCount: error.gamificationReconciledUserCount,
    affectedUserCount: error.affectedUserCount,
    retryable: error.retryable,
  };
}

function localEventDate(startsAt: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(startsAt));
  } catch {
    throw new Error("Validation: le fuseau officiel SPOGOMI est invalide.");
  }
}

async function loadRecognitionSource(params: { supabase: SupabaseClient; eventId: string }): Promise<{
  event: EventRow;
  participants: SpogomiRecognitionParticipant[];
  missions: SpogomiMissionProof[];
  rankings: SpogomiOfficialRanking[];
  existingAwards: Array<Record<string, unknown>>;
}> {
  const eventResult = await params.supabase.from("spogomi_events").select("id, action_id, name, event_slug, starts_at, official_timezone, state, public_visibility").eq("id", params.eventId).maybeSingle();
  if (eventResult.error) throw eventResult.error;
  if (!eventResult.data) throw new Error("SPOGOMI event not found.");
  const event = eventResult.data as EventRow;
  const [participantsResult, attestationsResult, rankingsResult, participationResult, awardsResult] = await Promise.all([
    readAllSpogomiPages("recognition participants", (from, to) => params.supabase.from("spogomi_participants").select("id, event_id, division_id, team_id, clerk_id, registration_status, attendance_status, account_link_status", { count: "exact" }).eq("event_id", params.eventId).order("id", { ascending: true }).range(from, to), { requireExactCount: true }),
    readAllSpogomiPages("recognition attestations", (from, to) => params.supabase.from("spogomi_recognition_attestations").select("id, event_id, division_id, participant_id, kind, status, certified_at, evidence_reference, certification_version", { count: "exact" }).eq("event_id", params.eventId).order("id", { ascending: true }).range(from, to), { requireExactCount: true }),
    readAllSpogomiPages("recognition rankings", (from, to) => params.supabase.from("spogomi_official_rankings").select("id, event_id, division_id, team_id, kind, rank, status, team_eligible, decision_version, source_reference", { count: "exact" }).eq("event_id", params.eventId).order("id", { ascending: true }).range(from, to), { requireExactCount: true }),
    readAllSpogomiPages("confirmed action participants", (from, to) => params.supabase.from("action_participants").select("id, user_id", { count: "exact" }).eq("action_id", event.action_id).eq("participation_status", "confirmed").order("id", { ascending: true }).range(from, to), { requireExactCount: true }),
    readAllSpogomiPages("existing recognition awards", (from, to) => params.supabase.from("spogomi_collection_awards").select("id, user_id, division_id, badge_type_id, proof_reference, certification_reference, ranking_version, status", { count: "exact" }).eq("event_id", params.eventId).order("id", { ascending: true }).range(from, to), { requireExactCount: true }),
  ]);
  const confirmedUsers = new Set(participationResult.map((row) => String(row.user_id)));
  const rawParticipants = participantsResult as Array<Record<string, unknown>>;
  const rawAttestations = attestationsResult as Array<Record<string, unknown>>;
  const participants = rawParticipants.map((row): SpogomiRecognitionParticipant => ({
    participantId: String(row.id), eventId: String(row.event_id), divisionId: row.division_id ? String(row.division_id) : undefined, teamId: row.team_id ? String(row.team_id) : null,
    userId: row.clerk_id ? String(row.clerk_id) : null,
    registrationStatus: String(row.registration_status) as SpogomiRecognitionParticipant["registrationStatus"],
    attendanceStatus: String(row.attendance_status) as SpogomiRecognitionParticipant["attendanceStatus"],
    identityVerified: row.account_link_status === "verified" && Boolean(row.clerk_id),
    collectorActivityCertified: rawAttestations.some((attestation) => String(attestation.participant_id) === String(row.id) && attestation.kind === "collector" && attestation.status === "certified"),
    actionParticipationConfirmed: Boolean(row.clerk_id && confirmedUsers.has(String(row.clerk_id))),
    teamDisqualified: false,
  }));
  const missions = rawAttestations.filter((row) => row.kind === "referee" || row.kind === "organizer").map((row): SpogomiMissionProof => ({
    missionId: String(row.id), eventId: String(row.event_id), divisionId: row.division_id ? String(row.division_id) : undefined, participantId: String(row.participant_id),
    kind: row.kind as SpogomiMissionProof["kind"], status: row.status as SpogomiMissionProof["status"],
    certifiedAt: row.certified_at ? String(row.certified_at) : null,
    evidenceReference: String(row.evidence_reference), certificationVersion: String(row.certification_version),
  }));
  const rankings = (rankingsResult as Array<Record<string, unknown>>).map((row): SpogomiOfficialRanking => ({
    eventId: String(row.event_id), divisionId: row.division_id ? String(row.division_id) : undefined, teamId: String(row.team_id), kind: row.kind as SpogomiOfficialRanking["kind"],
    rank: Number(row.rank), status: row.status as SpogomiOfficialRanking["status"], teamEligible: Boolean(row.team_eligible),
    decisionVersion: String(row.decision_version), sourceReference: String(row.source_reference),
  }));
  // Keep the read intentionally bounded to IDs; no roster names or emails leave the server.
  return { event, participants, missions, rankings, existingAwards: awardsResult as Array<Record<string, unknown>> };
}

async function reconcileFirstReferee(supabase: SupabaseClient, userId: string, facts: GamificationFacts): Promise<void> {
  await reconcileUserGamification(supabase, userId, {
    facts,
    reasonCategory: "data_correction",
  });
}

function recognitionFingerprint(awards: Array<{ divisionId?: string | null; badgeTypeId: string; proofReference: string; certificationReference: string; rankingVersion: string | null; status: string }>): string {
  const canonical = [...awards].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

async function emitSpogomiRecognitionNotifications(params: {
  supabase: SupabaseClient;
  eventId: string;
  eventName: string;
  previousAwards: Array<Record<string, unknown>>;
  desiredAwards: SpogomiAward[];
}): Promise<void> {
  const previousByUser = new Map<string, Array<{ divisionId: string | null; badgeTypeId: string; proofReference: string; certificationReference: string; rankingVersion: string | null; status: string }>>();
  for (const award of params.previousAwards) {
    const userId = String(award.user_id);
    const current = previousByUser.get(userId) ?? [];
    current.push({ divisionId: award.division_id ? String(award.division_id) : null, badgeTypeId: String(award.badge_type_id), proofReference: String(award.proof_reference), certificationReference: String(award.certification_reference), rankingVersion: award.ranking_version ? String(award.ranking_version) : null, status: String(award.status) });
    previousByUser.set(userId, current);
  }
  const desiredByUser = new Map<string, SpogomiAward[]>();
  for (const award of params.desiredAwards) desiredByUser.set(award.userId, [...(desiredByUser.get(award.userId) ?? []), award]);
  const userIds = new Set([...previousByUser.keys(), ...desiredByUser.keys()]);
  for (const userId of userIds) {
    const previous = previousByUser.get(userId) ?? [];
    const desired = desiredByUser.get(userId) ?? [];
    const previousFingerprint = recognitionFingerprint(previous);
    const desiredFingerprint = recognitionFingerprint(desired.map((award) => ({ divisionId: award.divisionId ?? null, badgeTypeId: award.badgeTypeId, proofReference: award.proofReference, certificationReference: award.certificationReference, rankingVersion: award.rankingVersion, status: "active" })));
    if (previousFingerprint === desiredFingerprint || (previous.length === 0 && desired.length === 0)) continue;
    const previousIds = new Set(previous.map((award) => award.badgeTypeId));
    const desiredIds = new Set(desired.map((award) => award.badgeTypeId));
    const addedCount = [...desiredIds].filter((id) => !previousIds.has(id)).length;
    const removedCount = [...previousIds].filter((id) => !desiredIds.has(id)).length;
    const recognitionId = `${params.eventId}:${desiredFingerprint}`;
    const result = await params.supabase.from("app_notifications").insert({
      user_id: userId,
      type: "gamification_recognition",
      title: "Vos distinctions SPOGOMI ont été mises à jour.",
      content: `Le récapitulatif de ${params.eventName} a été actualisé après certification ou correction.`,
      payload: { kind: "spogomi_recognition", schemaVersion: 1, recognitionId, eventId: params.eventId, addedCount, removedCount, href: "/sections/gamification#spogomi-collection" },
    });
    if (result.error && result.error.code !== "23505") throw new Error(result.error.message);
  }
}

export async function reconcileSpogomiRecognition(params: { supabase: SupabaseClient; eventId: string; actorClerkId: string }) {
  const source = await loadRecognitionSource({ supabase: params.supabase, eventId: params.eventId });
  if (source.event.state !== "certified") throw new Error("Validation: l’événement SPOGOMI doit être certifié avant les reconnaissances.");
  const projection = buildSpogomiRecognitionProjection({
    eventId: source.event.id,
    eventDate: localEventDate(source.event.starts_at, source.event.official_timezone),
    participants: source.participants,
    missions: source.missions,
    rankings: source.rankings,
  });
  const affectedUsers = new Set([
    ...source.participants.map((participant) => participant.userId).filter((userId): userId is string => Boolean(userId)),
    ...source.existingAwards.map((award) => typeof award.user_id === "string" ? award.user_id : null).filter((userId): userId is string => Boolean(userId)),
  ]);
  const factsByUser = new Map<string, GamificationFacts>();
  await Promise.all([...affectedUsers].map(async (userId) => {
    factsByUser.set(userId, await loadCurrentGamificationFacts(params.supabase, userId));
  }));
  const rpc = await params.supabase.rpc("reconcile_spogomi_collection_awards_for_divisions", {
    p_event_id: params.eventId,
    p_awards: projection.awards,
    p_actor_clerk_id: params.actorClerkId,
  });
  if (rpc.error) throw rpc.error;
  let gamificationReconciledUserCount = 0;
  try {
    for (const userId of affectedUsers) {
      await reconcileFirstReferee(params.supabase, userId, factsByUser.get(userId)!);
      gamificationReconciledUserCount += 1;
    }
  } catch (error) {
    throw new SpogomiRecognitionPartialError({
      eventId: params.eventId,
      affectedUserCount: affectedUsers.size,
      gamificationReconciledUserCount,
      cause: error,
    });
  }
  try {
    await emitSpogomiRecognitionNotifications({
      supabase: params.supabase,
      eventId: source.event.id,
      eventName: source.event.name,
      previousAwards: source.existingAwards,
      desiredAwards: projection.awards,
    });
  } catch (error) {
    logFailure("SPOGOMI/Recognition", "Recognition notification write skipped", error, { eventId: source.event.id });
  }
  return {
    status: "complete" as const,
    eventId: params.eventId,
    awardsReconciled: Number(rpc.data ?? 0),
    awards: projection.awards.length,
    collectorEvents: projection.collectorEventCount,
    refereeEvents: projection.refereeEventCount,
    rankingsConsumed: source.rankings.filter((ranking) => ranking.status === "certified").length,
  };
}

export async function loadSpogomiCollectionForUser(supabase: SupabaseClient, userId: string) {
  const awards = await readAllSpogomiPages("private recognition collection", (from, to) => supabase.from("spogomi_collection_awards").select("id, event_id, division_id, badge_type_id, event_year, event_local_date, awarded_at, proof_reference, certification_reference, ranking_version, status", { count: "exact" }).eq("user_id", userId).in("status", ["active", "revoked", "replaced"]).order("event_local_date", { ascending: false }).order("awarded_at", { ascending: false }).order("id", { ascending: true }).range(from, to), { requireExactCount: true }) as Array<Record<string, unknown>>;
  const eventIds = [...new Set(awards.map((award) => String(award.event_id)))];
  const eventRows = eventIds.length === 0
    ? []
    : await readAllSpogomiPages("private recognition event metadata", (from, to) => supabase.from("spogomi_events").select("id, name, event_slug, state, public_visibility", { count: "exact" }).in("id", eventIds).order("id", { ascending: true }).range(from, to), { requireExactCount: true }) as Array<Record<string, unknown>>;
  const events = new Map(eventRows.map((event) => [String(event.id), event]));
  const activeAwards = awards.filter((award) => award.status === "active");
  const collectorEvents = new Set(activeAwards.filter((award) => award.badge_type_id === "spogomi_collector").map((award) => String(award.event_id)));
  const refereeEvents = new Set(activeAwards.filter((award) => award.badge_type_id === "spogomi_referee").map((award) => String(award.event_id)));
  const projection: SpogomiCollection = {
    awards: awards.map((award): SpogomiCollectionAward => {
      const event = events.get(String(award.event_id));
      return {
        id: String(award.id), eventId: String(award.event_id), divisionId: award.division_id ? String(award.division_id) : null, badgeTypeId: String(award.badge_type_id),
        eventYear: Number(award.event_year), eventLocalDate: String(award.event_local_date), awardedAt: String(award.awarded_at),
        proofReference: String(award.proof_reference), certificationReference: String(award.certification_reference),
        rankingVersion: award.ranking_version ? String(award.ranking_version) : null,
        status: String(award.status) as SpogomiCollectionAward["status"],
        eventName: String(event?.name ?? "Événement SPOGOMI"),
        eventSlug: event?.event_slug ? String(event.event_slug) : null,
        eventState: String(event?.state ?? "unknown"),
        eventPublic: event?.public_visibility === "published",
      };
    }),
    spogomiAwardCount: activeAwards.length,
    spogomiDistinctBadgeTypes: new Set(activeAwards.map((award) => String(award.badge_type_id))).size,
    spogomiEventsParticipated: collectorEvents.size,
    collectorProgress: buildSpogomiSpecializedProgress("spogomi_collector_progress", collectorEvents.size),
    refereeProgress: buildSpogomiSpecializedProgress("spogomi_referee_progress", refereeEvents.size),
  };
  return projection;
}

export type SpogomiEventRecognition = {
  status: "pending_certification" | "available" | "no_awards";
  awards: Array<Pick<SpogomiCollectionAward, "id" | "eventId" | "badgeTypeId" | "eventYear" | "eventLocalDate" | "status">>;
};

export async function loadSpogomiEventRecognitionForUser(
  supabase: SupabaseClient,
  params: { eventId: string; userId: string },
): Promise<SpogomiEventRecognition> {
  const [eventResult, awardsResult] = await Promise.all([
    supabase.from("spogomi_events").select("id, state").eq("id", params.eventId).maybeSingle(),
    supabase.from("spogomi_collection_awards").select("id, event_id, division_id, badge_type_id, event_year, event_local_date, status").eq("event_id", params.eventId).eq("user_id", params.userId).eq("status", "active").order("event_local_date", { ascending: true }).order("id", { ascending: true }),
  ]);
  if (eventResult.error) throw eventResult.error;
  if (awardsResult.error) throw awardsResult.error;
  if (!eventResult.data) return { status: "no_awards", awards: [] };
  const awards = (awardsResult.data ?? []).map((award) => ({
    id: String(award.id), eventId: String(award.event_id), divisionId: award.division_id ? String(award.division_id) : null, badgeTypeId: String(award.badge_type_id),
    eventYear: Number(award.event_year), eventLocalDate: String(award.event_local_date),
    status: String(award.status) as "active" | "revoked" | "replaced",
  }));
  if (eventResult.data.state !== "certified") return { status: "pending_certification", awards: [] };
  return { status: awards.length > 0 ? "available" : "no_awards", awards };
}
