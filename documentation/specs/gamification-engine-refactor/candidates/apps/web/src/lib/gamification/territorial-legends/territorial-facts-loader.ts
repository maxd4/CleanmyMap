import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPublicLeaderboardLabel } from "@/lib/gamification/progression/progression-ranking";
import {
  getUserOptionalConsentEligibility,
} from "@/lib/minor-consent-server";
import { isOptionalConsentTreatmentAllowed, parseAgeBand } from "@/lib/minor-consent";
import { parseTerritorialLegendAttribution } from "./attribution";
import { loadTerritorialLegendPages } from "./pagination";
import type { TerritorialActionFact, TerritorialLegendConsent, TerritorialParticipationFact, TerritorialPublicProfile } from "./types";
import { parisDate, windowStart } from "./territorial-window";

type RawActionRow = {
  id: string;
  action_date: string;
  territorial_legend_attribution: unknown;
  data_provenance: "unknown" | "real" | "test";
};

type RawParticipantRow = { action_id: string; user_id: string; joined_at: string };

type RawProfileRow = {
  id: string;
  display_name: string | null;
  display_name_mode: string | null;
  handle: string | null;
};

function asActionRow(value: unknown): RawActionRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<RawActionRow>;
  return typeof row.id === "string" && typeof row.action_date === "string"
    ? {
        id: row.id,
        action_date: row.action_date,
        territorial_legend_attribution: row.territorial_legend_attribution,
        data_provenance: row.data_provenance ?? "unknown",
      }
    : null;
}

async function loadInChunks<T>(load: (ids: string[]) => Promise<T[]>, ids: readonly string[]): Promise<T[]> {
  const result: T[] = [];
  for (let index = 0; index < ids.length; index += 500) {
    result.push(...await load(ids.slice(index, index + 500)));
  }
  return result;
}

export type TerritorialLegendLoadedFacts = {
  actions: TerritorialActionFact[];
  participations: TerritorialParticipationFact[];
  consents: TerritorialLegendConsent[];
  profiles: TerritorialPublicProfile[];
  clerkEligibilityUnavailableUserIds: string[];
};

async function loadActions(supabase: SupabaseClient, now: Date): Promise<TerritorialActionFact[]> {
  const start = parisDate(windowStart(now));
  const actionRows = await loadTerritorialLegendPages({
    resource: "actions",
    loadPage: async (from, to) => {
      const result = await supabase
        .from("actions")
        .select("id, action_date, territorial_legend_attribution, data_provenance")
        .eq("status", "approved")
        .eq("action_phase", "post_action_complete")
        .not("published_at", "is", null)
        .eq("moderation_visibility", "visible")
        .eq("access_mode", "public")
        .or("data_provenance.is.null,data_provenance.neq.test")
        .or("review_state.is.null,review_state.in.(not_required,approved)")
        .gte("action_date", start)
        .lte("action_date", parisDate(now))
        .order("id", { ascending: true })
        .range(from, to);
      return {
        data: Array.isArray(result.data) ? result.data as RawActionRow[] : result.data,
        error: result.error,
      };
    },
  });
  const actions = actionRows
    .map(asActionRow)
    .filter((row): row is RawActionRow => row !== null)
    .flatMap((row) => {
      const territory = parseTerritorialLegendAttribution(row.territorial_legend_attribution, {
        actionId: row.id,
        actionDate: row.action_date,
      });
      return territory ? [{ actionId: row.id, actionDate: row.action_date, territory }] : [];
    });
  return actions;
}

async function loadParticipations(supabase: SupabaseClient, actions: readonly TerritorialActionFact[]): Promise<TerritorialParticipationFact[]> {
  const actionIds = actions.map((action) => action.actionId);
  const participationResult = await loadInChunks(async (ids) => {
    return loadTerritorialLegendPages({
      resource: "action_participants",
      loadPage: async (from, to) => {
        const result = await supabase
          .from("action_participants")
          .select("action_id, user_id, joined_at")
          .in("action_id", ids)
          .eq("participation_status", "confirmed")
          .order("action_id", { ascending: true })
          .order("user_id", { ascending: true })
          .order("joined_at", { ascending: true })
          .range(from, to);
        return {
          data: Array.isArray(result.data) ? result.data as RawParticipantRow[] : result.data,
          error: result.error,
        };
      },
    });
  }, actionIds);
  const participations: TerritorialParticipationFact[] = participationResult.map((row) => ({
    actionId: row.action_id,
    userId: row.user_id,
    joinedAt: row.joined_at,
  }));
  return participations;
}

async function loadConsents(supabase: SupabaseClient, userIds: readonly string[]): Promise<TerritorialLegendConsent[]> {
  const consentResult = await loadInChunks<TerritorialLegendConsent>(async (ids) => {
    const rows = await loadTerritorialLegendPages({
      resource: "territorial_legend_consents",
      loadPage: async (from, to) => {
        const result = await supabase
          .from("territorial_legend_consents")
          .select("user_id, enabled, age_band, activated_at, revoked_at")
          .in("user_id", ids)
          .order("user_id", { ascending: true })
          .range(from, to);
        return { data: Array.isArray(result.data) ? result.data : result.data, error: result.error };
      },
    });
    return rows.flatMap((row) => {
      const value = row as { user_id?: unknown; enabled?: unknown; age_band?: unknown; activated_at?: unknown; revoked_at?: unknown };
      return typeof value.user_id === "string"
        ? [{
            userId: value.user_id,
            enabled: value.enabled === true,
            ageBand: parseAgeBand(value.age_band),
            activatedAt: typeof value.activated_at === "string" ? value.activated_at : null,
            revokedAt: typeof value.revoked_at === "string" ? value.revoked_at : null,
            ageEligible: undefined,
          }]
        : [];
    });
  }, userIds);
  return consentResult;
}

async function resolveEligibility(consentResult: TerritorialLegendConsent[]) {
  const clerkEligibility = await Promise.all(consentResult.filter((consent) => consent.enabled).map(async (consent) => {
    const eligibility = await getUserOptionalConsentEligibility(consent.userId);
    return {
      userId: consent.userId,
      available: eligibility.status === "verified",
      ageBand: eligibility.ageBand,
      ageEligible: eligibility.status === "verified" && isOptionalConsentTreatmentAllowed(eligibility),
    };
  }));
  const clerkEligibilityUnavailableUserIds = clerkEligibility
    .filter((consent) => !consent.available)
    .map((consent) => consent.userId);
  const publicConsentIds = new Set(
    clerkEligibility.filter((consent) => consent.ageEligible).map((consent) => consent.userId),
  );
  for (const consent of consentResult) {
    if (consent.enabled) {
      const currentEligibility = clerkEligibility.find((entry) => entry.userId === consent.userId);
      consent.verifiedAgeBand = currentEligibility?.available ? currentEligibility.ageBand : undefined;
      consent.ageEligible = currentEligibility?.available
        ? publicConsentIds.has(consent.userId)
        : false;
    }
  }
  return { publicConsentIds, clerkEligibilityUnavailableUserIds };
}

async function loadProfiles(supabase: SupabaseClient, eligibleUserIds: readonly string[], ownerUserId: string | null): Promise<TerritorialPublicProfile[]> {
  const profileResult = await loadInChunks(async (ids) => {
    return loadTerritorialLegendPages({
      resource: "profiles",
      loadPage: async (from, to) => {
        const result = await supabase
          .from("profiles")
          .select("id, display_name, display_name_mode, handle")
          .in("id", ids)
          .order("id", { ascending: true })
          .range(from, to);
        return {
          data: Array.isArray(result.data) ? result.data as RawProfileRow[] : result.data,
          error: result.error,
        };
      },
    });
  }, eligibleUserIds);
  const profiles = profileResult.flatMap((row) => {
    const publicLabel = buildPublicLeaderboardLabel({ display_name: row.display_name, display_name_mode: row.display_name_mode, handle: row.handle });
    if (publicLabel) return [{ userId: row.id, publicLabel }];
    return ownerUserId === row.id ? [{ userId: row.id, publicLabel: "Vous" }] : [];
  });
  return profiles;
}

export async function loadTerritorialLegendFacts(
  supabase: SupabaseClient,
  params: { now?: Date; ownerUserId?: string | null } = {},
): Promise<TerritorialLegendLoadedFacts> {
  const now = params.now ?? new Date();
  const actions = await loadActions(supabase, now);
  if (actions.length === 0) return {
    actions: [],
    participations: [],
    consents: [],
    profiles: [],
    clerkEligibilityUnavailableUserIds: [],
  };
  const participations = await loadParticipations(supabase, actions);
  const userIds = [...new Set(participations.map((row) => row.userId).filter(Boolean))];
  const consentResult = await loadConsents(supabase, userIds);
  const { publicConsentIds, clerkEligibilityUnavailableUserIds } = await resolveEligibility(consentResult);
  const ownerUserId = params.ownerUserId ?? null;
  const eligibleUserIds = [...new Set([
    ...publicConsentIds,
    ...(ownerUserId && userIds.includes(ownerUserId) ? [ownerUserId] : []),
  ])];
  const profiles = await loadProfiles(supabase, eligibleUserIds, ownerUserId);
  return {
    actions,
    participations,
    consents: consentResult,
    profiles,
    clerkEligibilityUnavailableUserIds,
  };
}
