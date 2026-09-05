import { getCurrentUserRoleLabel, requireAuthenticatedAccess } from "@/lib/authz";
import { isAdminLikeProfile, toProfile } from "@/lib/profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { MissionStatus } from "@/components/missions/mission-page-contract";

const MISSION_GPS_POINT_LIMIT = 1000;

export type MissionSummary = {
  id: string;
  label: string | null;
  status: MissionStatus | null;
  started_at: string | null;
  ended_at: string | null;
  distance_m: number | null;
  duration_s: number | null;
};

export type MissionGpsPoint = {
  latitude: number;
  longitude: number;
  recorded_at: string;
};

type MissionRecordWithOwner = MissionSummary & {
  volunteer_id: string | null;
};

export type MissionAccessResult =
  | { kind: "unauthenticated"; status: 401; error: string }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "ok"; mission: MissionSummary; points: MissionGpsPoint[] };

export async function readAuthorizedMission(
  missionId: string,
): Promise<MissionAccessResult> {
  const authentication = await requireAuthenticatedAccess();
  if (!authentication.ok) {
    return {
      kind: "unauthenticated",
      status: authentication.status,
      error: authentication.error,
    };
  }

  const role = await getCurrentUserRoleLabel();
  const isPrivileged =
    role !== "anonymous" && isAdminLikeProfile(toProfile(role));
  const supabase = getSupabaseServerClient(true);

  const missionResult = await supabase
    .from("missions")
    .select(
      "id, label, status, started_at, ended_at, distance_m, duration_s, volunteer_id",
    )
    .eq("id", missionId)
    .maybeSingle();

  if (missionResult.error) {
    throw missionResult.error;
  }

  const missionRecord = (missionResult.data as MissionRecordWithOwner | null) ?? null;
  if (!missionRecord) {
    return { kind: "not_found" };
  }

  const isOwner = missionRecord.volunteer_id === authentication.userId;
  if (!isOwner && !isPrivileged) {
    return { kind: "forbidden" };
  }

  const pointsResult = await supabase
    .from("gps_points")
    .select("latitude, longitude, recorded_at")
    .eq("mission_id", missionId)
    .order("recorded_at")
    .limit(MISSION_GPS_POINT_LIMIT);

  if (pointsResult.error) {
    throw pointsResult.error;
  }

  const mission: MissionSummary = {
    id: missionRecord.id,
    label: missionRecord.label,
    status: missionRecord.status,
    started_at: missionRecord.started_at,
    ended_at: missionRecord.ended_at,
    distance_m: missionRecord.distance_m,
    duration_s: missionRecord.duration_s,
  };
  return {
    kind: "ok",
    mission,
    points: (pointsResult.data ?? []) as MissionGpsPoint[],
  };
}
