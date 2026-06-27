import type { SupabaseClient } from "@supabase/supabase-js";
import { extractZoneFromLabel } from "@/lib/geo/greater-paris";
import {
  extractArrondissementFromLabel,
  getAffectedArrondissements,
  isParisArrondissementLabel,
} from "@/lib/geo/paris-arrondissements";
import { getNeighbors, getSuburbsForDistrict } from "@/lib/geo/paris-neighborhood";

export type CommunityEventNotificationTargets = {
  arrondissementIds: number[];
  zoneNames: string[];
};

export type CommunityEventNotificationProfileRow = {
  id: string;
  paris_arrondissement: number | null;
  metadata: Record<string, unknown> | null;
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function uniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value))));
}

export function getCommunityEventNotificationTargets(
  locationLabel: string,
): CommunityEventNotificationTargets | null {
  const normalized = locationLabel.trim();
  if (!normalized) {
    return null;
  }

  const arrondissement = isParisArrondissementLabel(normalized)
    ? extractArrondissementFromLabel(normalized)
    : null;
  if (arrondissement !== null) {
    return {
      arrondissementIds: uniqueNumbers(getAffectedArrondissements(arrondissement)),
      zoneNames: uniqueStrings(getSuburbsForDistrict(arrondissement)),
    };
  }

  const zone = extractZoneFromLabel(normalized);
  if (!zone) {
    return null;
  }

  const neighbors = getNeighbors(zone.name);
  const arrondissementIds = uniqueNumbers(
    neighbors
      .map((neighbor: string) => extractArrondissementFromLabel(neighbor))
      .filter((value: number | null): value is number => value !== null),
  );
  const zoneNames = uniqueStrings(
    [zone.name, ...neighbors].filter(
      (value) => extractArrondissementFromLabel(value) === null,
    ),
  );

  return {
    arrondissementIds,
    zoneNames,
  };
}

export async function loadCommunityEventNotificationProfiles(
  supabase: SupabaseClient,
  params: {
    excludedProfileId: string;
    targets: CommunityEventNotificationTargets;
  },
): Promise<CommunityEventNotificationProfileRow[]> {
  if (
    params.targets.arrondissementIds.length === 0 &&
    params.targets.zoneNames.length === 0
  ) {
    return [];
  }

  const result = await supabase.rpc(
    "load_community_event_notification_profiles",
    {
      p_excluded_profile_id: params.excludedProfileId,
      p_arrondissement_ids: params.targets.arrondissementIds,
      p_zone_names: params.targets.zoneNames,
    },
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as CommunityEventNotificationProfileRow[];
}

export function isProfileEligibleForCommunityEvent(
  profile: {
    paris_arrondissement: number | null;
    metadata: Record<string, unknown> | null;
  },
  targets: CommunityEventNotificationTargets,
): boolean {
  if (
    typeof profile.paris_arrondissement === "number" &&
    targets.arrondissementIds.includes(profile.paris_arrondissement)
  ) {
    return true;
  }

  const zoneName = profile.metadata?.["zoneName"];
  if (typeof zoneName !== "string" || zoneName.trim().length === 0) {
    return false;
  }

  return targets.zoneNames.some(
    (candidate) => candidate.toLowerCase() === zoneName.trim().toLowerCase(),
  );
}
