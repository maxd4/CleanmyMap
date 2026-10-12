import type { SupabaseClient } from "@supabase/supabase-js";
import type { GamificationSourceFact } from "@/lib/gamification/gamification-reconstruction";
import { readAllSpogomiPages } from "./pagination";
import { isEligibleSpogomiMissionParticipant, type SpogomiRecognitionParticipant } from "./recognition";

type Row = Record<string, unknown>;

/** Returns at most one current fact so the first-referee milestone stays one-shot. */
export async function loadSpogomiFirstRefereeFact(supabase: SupabaseClient, userId: string): Promise<GamificationSourceFact | null> {
  const participants = await readAllSpogomiPages("first referee participants", (from, to) =>
    supabase.from("spogomi_participants")
      .select("id, event_id, clerk_id, registration_status, attendance_status, account_link_status", { count: "exact" })
      .eq("clerk_id", userId)
      .eq("account_link_status", "verified")
      .order("id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  ) as Row[];
  const participantIds = participants.map((row) => String(row.id));
  if (participantIds.length === 0) return null;

  const missions = await readAllSpogomiPages("first referee attestations", (from, to) =>
    supabase.from("spogomi_recognition_attestations")
      .select("id, participant_id, event_id, certified_at, certification_version, evidence_reference", { count: "exact" })
      .in("participant_id", participantIds)
      .eq("kind", "referee")
      .eq("status", "certified")
      .order("id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  ) as Row[];
  const eventIds = [...new Set(missions.map((mission) => String(mission.event_id)))];
  if (eventIds.length === 0) return null;

  const eventRows = await readAllSpogomiPages("first referee events", (from, to) =>
    supabase.from("spogomi_events")
      .select("id, action_id, starts_at, official_timezone, state", { count: "exact" })
      .in("id", eventIds)
      .order("id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  ) as Row[];
  const events = new Map(eventRows.map((event) => [String(event.id), event]));
  const actionIds = [...new Set(eventRows.map((event) => String(event.action_id)))];
  const confirmedActionRows = actionIds.length === 0
    ? []
    : await readAllSpogomiPages("first referee action participation", (from, to) =>
      supabase.from("action_participants")
        .select("id, action_id", { count: "exact" })
        .in("action_id", actionIds)
        .eq("user_id", userId)
        .eq("participation_status", "confirmed")
        .order("id", { ascending: true })
        .range(from, to),
      { requireExactCount: true },
    );
  const confirmedActionIds = new Set(confirmedActionRows.map((row) => String((row as Row).action_id)));
  const participantById = new Map(participants.map((row) => [String(row.id), row]));

  const eligibleMissions = missions.filter((mission) => {
    const participant = participantById.get(String(mission.participant_id));
    const event = events.get(String(mission.event_id));
    if (!participant || !event || event.state !== "certified" || String(event.id) !== String(participant.event_id) || !confirmedActionIds.has(String(event.action_id))) return false;
    const typedParticipant: Pick<SpogomiRecognitionParticipant, "registrationStatus" | "attendanceStatus" | "identityVerified" | "actionParticipationConfirmed" | "userId"> = {
      registrationStatus: String(participant.registration_status) as SpogomiRecognitionParticipant["registrationStatus"],
      attendanceStatus: String(participant.attendance_status) as SpogomiRecognitionParticipant["attendanceStatus"],
      identityVerified: participant.account_link_status === "verified" && String(participant.clerk_id) === userId,
      actionParticipationConfirmed: true,
      userId,
    };
    return String(mission.evidence_reference ?? "").trim().length > 0 && isEligibleSpogomiMissionParticipant(typedParticipant);
  });
  const ordered = eligibleMissions.map((mission) => {
    const event = events.get(String(mission.event_id))!;
    const startsAt = typeof event.starts_at === "string" ? event.starts_at : String(mission.certified_at ?? "9999-12-31");
    const timezone = typeof event.official_timezone === "string" ? event.official_timezone : "UTC";
    let localDate = "9999-12-31";
    try { localDate = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(startsAt)); } catch { /* invalid legacy timezone falls behind valid official facts */ }
    return { mission, event, startsAt, localDate };
  }).sort((left, right) => `${left.localDate}:${left.startsAt}:${String(left.mission.certified_at ?? "")}:${String(left.mission.id)}`.localeCompare(`${right.localDate}:${right.startsAt}:${String(right.mission.certified_at ?? "")}:${String(right.mission.id)}`));
  const mission = ordered[0]?.mission;
  if (!mission) return null;
  const event = events.get(String(mission.event_id))!;
  return {
    mechanicId: "spogomi_first_referee", eventType: "spogomi_first_referee_certified", sourceTable: "spogomi_recognition_attestations",
    sourceId: userId, occurredOn: typeof event.starts_at === "string" ? event.starts_at : String(mission.certified_at),
    statusPhase: "validated", xpAwarded: 1, eligible: true, badgeId: "spogomi_first_referee",
    metadata: { missionId: String(mission.id), eventId: String(mission.event_id), certificationVersion: String(mission.certification_version) },
  };
}
