import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCurrentGamificationFacts } from "@/lib/gamification/gamification-facts-loader";
import { reconcileUserGamification } from "@/lib/gamification/gamification-reconciliation";
import {
  buildSpogomiRecognitionProjection,
  type SpogomiMissionProof,
  type SpogomiOfficialRanking,
  type SpogomiRecognitionParticipant,
} from "./recognition";
import { buildSpogomiSpecializedProgress } from "./progress";
import { loadSpogomiFirstRefereeFact } from "./gamification-facts";

type EventRow = { id: string; action_id: string; starts_at: string; official_timezone: string; state: string };

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
  existingAwardUsers: string[];
}> {
  const eventResult = await params.supabase.from("spogomi_events").select("id, action_id, starts_at, official_timezone, state").eq("id", params.eventId).maybeSingle();
  if (eventResult.error) throw eventResult.error;
  if (!eventResult.data) throw new Error("SPOGOMI event not found.");
  const event = eventResult.data as EventRow;
  const [participantsResult, attestationsResult, rankingsResult, participationResult, awardsResult] = await Promise.all([
    params.supabase.from("spogomi_participants").select("id, event_id, team_id, clerk_id, registration_status, attendance_status, account_link_status").eq("event_id", params.eventId),
    params.supabase.from("spogomi_recognition_attestations").select("id, event_id, participant_id, kind, status, certified_at, evidence_reference, certification_version").eq("event_id", params.eventId),
    params.supabase.from("spogomi_official_rankings").select("event_id, team_id, kind, rank, status, team_eligible, decision_version, source_reference").eq("event_id", params.eventId),
    params.supabase.from("action_participants").select("user_id").eq("action_id", event.action_id).eq("participation_status", "confirmed"),
    params.supabase.from("spogomi_collection_awards").select("user_id").eq("event_id", params.eventId),
  ]);
  for (const result of [participantsResult, attestationsResult, rankingsResult, participationResult, awardsResult]) if (result.error) throw result.error;
  const confirmedUsers = new Set((participationResult.data ?? []).map((row) => String(row.user_id)));
  const rawParticipants = (participantsResult.data ?? []) as Array<Record<string, unknown>>;
  const rawAttestations = (attestationsResult.data ?? []) as Array<Record<string, unknown>>;
  const participants = rawParticipants.map((row): SpogomiRecognitionParticipant => ({
    participantId: String(row.id), eventId: String(row.event_id), teamId: row.team_id ? String(row.team_id) : null,
    userId: row.clerk_id ? String(row.clerk_id) : null,
    registrationStatus: String(row.registration_status) as SpogomiRecognitionParticipant["registrationStatus"],
    attendanceStatus: String(row.attendance_status) as SpogomiRecognitionParticipant["attendanceStatus"],
    identityVerified: row.account_link_status === "verified" && Boolean(row.clerk_id),
    collectorActivityCertified: rawAttestations.some((attestation) => String(attestation.participant_id) === String(row.id) && attestation.kind === "collector" && attestation.status === "certified"),
    actionParticipationConfirmed: Boolean(row.clerk_id && confirmedUsers.has(String(row.clerk_id))),
    teamDisqualified: false,
  }));
  const missions = rawAttestations.filter((row) => row.kind === "referee" || row.kind === "organizer").map((row): SpogomiMissionProof => ({
    missionId: String(row.id), eventId: String(row.event_id), participantId: String(row.participant_id),
    kind: row.kind as SpogomiMissionProof["kind"], status: row.status as SpogomiMissionProof["status"],
    certifiedAt: row.certified_at ? String(row.certified_at) : null,
    evidenceReference: String(row.evidence_reference), certificationVersion: String(row.certification_version),
  }));
  const rankings = (rankingsResult.data ?? []).map((row): SpogomiOfficialRanking => ({
    eventId: String(row.event_id), teamId: String(row.team_id), kind: row.kind as SpogomiOfficialRanking["kind"],
    rank: Number(row.rank), status: row.status as SpogomiOfficialRanking["status"], teamEligible: Boolean(row.team_eligible),
    decisionVersion: String(row.decision_version), sourceReference: String(row.source_reference),
  }));
  // Keep the read intentionally bounded to IDs; no roster names or emails leave the server.
  return { event, participants, missions, rankings, existingAwardUsers: [...new Set((awardsResult.data ?? []).map((row) => String(row.user_id)))], };
}

async function reconcileFirstReferee(supabase: SupabaseClient, userId: string): Promise<void> {
  const facts = await loadCurrentGamificationFacts(supabase, userId);
  const firstReferee = await loadSpogomiFirstRefereeFact(supabase, userId);
  const sourceFacts = firstReferee ? [...facts.sourceFacts, firstReferee] : facts.sourceFacts;
  await reconcileUserGamification(supabase, userId, {
    facts: { ...facts, sourceFacts },
    reasonCategory: "data_correction",
  });
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
  const rpc = await params.supabase.rpc("reconcile_spogomi_collection_awards", {
    p_event_id: params.eventId,
    p_awards: projection.awards,
    p_actor_clerk_id: params.actorClerkId,
  });
  if (rpc.error) throw rpc.error;
  const affectedUsers = new Set([
    ...source.participants.map((participant) => participant.userId).filter((userId): userId is string => Boolean(userId)),
    ...source.existingAwardUsers,
  ]);
  for (const userId of affectedUsers) await reconcileFirstReferee(params.supabase, userId);
  return {
    eventId: params.eventId,
    awardsReconciled: Number(rpc.data ?? 0),
    awards: projection.awards.length,
    collectorEvents: projection.collectorEventCount,
    refereeEvents: projection.refereeEventCount,
    rankingsConsumed: source.rankings.filter((ranking) => ranking.status === "certified").length,
  };
}

export async function loadSpogomiCollectionForUser(supabase: SupabaseClient, userId: string) {
  const result = await supabase.from("spogomi_collection_awards").select("id, event_id, badge_type_id, event_year, event_local_date, awarded_at, proof_reference, certification_reference, ranking_version, status").eq("user_id", userId).eq("status", "active").order("event_local_date", { ascending: false }).order("awarded_at", { ascending: false });
  if (result.error) throw result.error;
  const awards = (result.data ?? []) as Array<Record<string, unknown>>;
  const collectorEvents = new Set(awards.filter((award) => award.badge_type_id === "spogomi_collector").map((award) => String(award.event_id)));
  const refereeEvents = new Set(awards.filter((award) => award.badge_type_id === "spogomi_referee").map((award) => String(award.event_id)));
  const projection = {
    awards: awards.map((award) => ({ id: String(award.id), eventId: String(award.event_id), badgeTypeId: String(award.badge_type_id), eventYear: Number(award.event_year), eventLocalDate: String(award.event_local_date), awardedAt: String(award.awarded_at), proofReference: String(award.proof_reference), certificationReference: String(award.certification_reference), rankingVersion: award.ranking_version ? String(award.ranking_version) : null })),
    spogomiAwardCount: awards.length,
    spogomiDistinctBadgeTypes: new Set(awards.map((award) => String(award.badge_type_id))).size,
    spogomiEventsParticipated: collectorEvents.size,
    collectorProgress: buildSpogomiSpecializedProgress("spogomi_collector_progress", collectorEvents.size),
    refereeProgress: buildSpogomiSpecializedProgress("spogomi_referee_progress", refereeEvents.size),
  };
  return projection;
}
