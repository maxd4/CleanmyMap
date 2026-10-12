import type { SupabaseClient } from "@supabase/supabase-js";
import type { GamificationSourceFact } from "@/lib/gamification/gamification-reconstruction";

/** Returns at most one current fact so the first-referee milestone stays one-shot. */
export async function loadSpogomiFirstRefereeFact(supabase: SupabaseClient, userId: string): Promise<GamificationSourceFact | null> {
  const participantsResult = await supabase.from("spogomi_participants").select("id").eq("clerk_id", userId).eq("account_link_status", "verified");
  if (participantsResult.error) throw participantsResult.error;
  const participantIds = (participantsResult.data ?? []).map((row) => String(row.id));
  if (participantIds.length === 0) return null;
  const missionsResult = await supabase.from("spogomi_recognition_attestations").select("id, participant_id, event_id, certified_at, certification_version").in("participant_id", participantIds).eq("kind", "referee").eq("status", "certified");
  if (missionsResult.error) throw missionsResult.error;
  const missions = (missionsResult.data ?? []) as Array<Record<string, unknown>>;
  const eventIds = [...new Set(missions.map((mission) => String(mission.event_id)))];
  const eventsResult = eventIds.length === 0
    ? { data: [], error: null }
    : await supabase.from("spogomi_events").select("id, starts_at, official_timezone").in("id", eventIds);
  if (eventsResult.error) throw eventsResult.error;
  const events = new Map((eventsResult.data ?? []).map((event) => [String(event.id), event as Record<string, unknown>]));
  const ordered = missions.map((mission) => {
    const event = events.get(String(mission.event_id));
    const startsAt = typeof event?.starts_at === "string" ? event.starts_at : String(mission.certified_at ?? "9999-12-31");
    const timezone = typeof event?.official_timezone === "string" ? event.official_timezone : "UTC";
    let localDate = "9999-12-31";
    try { localDate = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(startsAt)); } catch { /* invalid legacy timezone falls behind valid official facts */ }
    return { mission, startsAt, localDate };
  }).sort((left, right) => `${left.localDate}:${left.startsAt}:${String(left.mission.certified_at ?? "")}:${String(left.mission.id)}`.localeCompare(`${right.localDate}:${right.startsAt}:${String(right.mission.certified_at ?? "")}:${String(right.mission.id)}`));
  const mission = ordered[0]?.mission;
  if (!mission) return null;
  const event = events.get(String(mission.event_id));
  return {
    mechanicId: "spogomi_first_referee", eventType: "spogomi_first_referee_certified", sourceTable: "spogomi_recognition_attestations",
    sourceId: userId, occurredOn: typeof event?.starts_at === "string" ? event.starts_at : (typeof mission.certified_at === "string" ? mission.certified_at : new Date(0).toISOString()),
    statusPhase: "validated", xpAwarded: 1, eligible: true, badgeId: "spogomi_first_referee",
    metadata: { missionId: String(mission.id), eventId: String(mission.event_id), certificationVersion: String(mission.certification_version) },
  };
}
