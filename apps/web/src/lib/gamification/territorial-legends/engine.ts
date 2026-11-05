import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPublicLeaderboardLabel } from "@/lib/gamification/progression/progression-ranking";
import {
  getUserOptionalConsentEligibility,
} from "@/lib/minor-consent-server";
import { isOptionalConsentTreatmentAllowed, parseAgeBand } from "@/lib/minor-consent";
import { campaignStartDate, campaignYearForCivilDate } from "./campaign";
import { parseTerritorialLegendAttribution } from "./attribution";
import { loadTerritorialLegendPages } from "./pagination";
import {
  TERRITORIAL_LEGEND_LEVELS,
  type TerritorialActionFact,
  type TerritorialLegendConsent,
  type TerritorialLegendEntry,
  type TerritorialLegendLevel,
  type TerritorialLegendPage,
  type TerritorialParticipationFact,
  type TerritorialPart,
  type TerritorialPublicProfile,
  type TerritorialLegendWinnerSnapshot,
} from "./types";

export const TERRITORIAL_LEGEND_WINDOW_DAYS = 90;
export { TERRITORIAL_LEGEND_COG_YEAR } from "./attribution";

type RankedInternalEntry = TerritorialLegendEntry & { userId: string; actionIds: string[] };

export type BuildLeaderboardParams = {
  level: TerritorialLegendLevel;
  territoryCode: string;
  territoryLabel?: string | null;
  now?: Date;
  actions: readonly TerritorialActionFact[];
  participations: readonly TerritorialParticipationFact[];
  consents: readonly TerritorialLegendConsent[];
  profiles: readonly TerritorialPublicProfile[];
  limit?: number;
  cursor?: string | null;
  ownerUserId?: string | null;
};

function parisDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function parseActionDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? parsed
    : null;
}

function windowStart(now: Date): Date {
  const currentDate = parisDate(now);
  const [year, month, day] = currentDate.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 12));
  start.setUTCDate(start.getUTCDate() - (TERRITORIAL_LEGEND_WINDOW_DAYS - 1));
  const campaignStart = new Date(`${campaignStartDate(campaignYearForCivilDate(currentDate))}T12:00:00Z`);
  if (start < campaignStart) return campaignStart;
  return start;
}

function territoryPartForLevel(
  action: TerritorialActionFact,
  level: TerritorialLegendLevel,
): TerritorialPart | null {
  if (level === "country") return action.territory.country;
  if (level === "region") return action.territory.region;
  if (level === "department") return action.territory.department;
  if (level === "commune") return action.territory.commune;
  return action.territory.arrondissement ?? null;
}

function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { offset?: unknown };
    return typeof decoded.offset === "number" && Number.isInteger(decoded.offset) && decoded.offset >= 0
      ? decoded.offset
      : 0;
  } catch {
    return 0;
  }
}

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

function rankEntries(entries: readonly RankedInternalEntry[]): RankedInternalEntry[] {
  const ordered = [...entries].sort((a, b) =>
    b.score - a.score ||
    a.publicLabel.localeCompare(b.publicLabel, "fr", { sensitivity: "base" }) ||
    a.userId.localeCompare(b.userId),
  );
  const counts = new Map<number, number>();
  for (const item of ordered) counts.set(item.score, (counts.get(item.score) ?? 0) + 1);
  return ordered.reduce<RankedInternalEntry[]>((ranked, item, index) => {
    const previous = ranked[index - 1];
    ranked.push({
      ...item,
      rank: !previous || ordered[index - 1]?.score !== item.score ? index + 1 : previous.rank,
      tied: (counts.get(item.score) ?? 0) > 1,
      tieSize: counts.get(item.score) ?? 1,
    });
    return ranked;
  }, []);
}

function buildRankedEntries(
  params: Pick<BuildLeaderboardParams, "level" | "territoryCode" | "now" | "actions" | "participations" | "consents" | "profiles" | "ownerUserId">,
  options: { includeOwnerPrivate?: boolean } = {},
): RankedInternalEntry[] {
  const now = params.now ?? new Date();
  const targetCode = params.territoryCode.trim();
  const consentByUser = new Map(params.consents.map((consent) => [consent.userId, consent]));
  const profileByUser = new Map(params.profiles.map((profile) => [profile.userId, profile]));
  const actionById = new Map(params.actions.map((action) => [action.actionId, action]));
  const actionsByUser = new Map<string, Set<string>>();

  for (const participation of params.participations) {
    const action = actionById.get(participation.actionId);
    const consent = consentByUser.get(participation.userId);
    const isPrivateOwner = options.includeOwnerPrivate === true && params.ownerUserId === participation.userId;
    if (!action || !consent || !contributionIsEligible(action, participation, consent, now, isPrivateOwner)) continue;
    const territory = territoryPartForLevel(action, params.level);
    if (!territory || territory.code !== targetCode) continue;
    if (!profileByUser.has(participation.userId)) continue;
    const userActions = actionsByUser.get(participation.userId) ?? new Set<string>();
    userActions.add(participation.actionId);
    actionsByUser.set(participation.userId, userActions);
  }

  return rankEntries([...actionsByUser.entries()].flatMap(([userId, actionIds]) => {
    const profile = profileByUser.get(userId);
    const score = actionIds.size;
    return profile && score > 0
      ? [{ userId, actionIds: [...actionIds].sort(), publicLabel: profile.publicLabel, score, distinctActions: score, rank: 0, tied: false, tieSize: 1 }]
      : [];
  }));
}

function contributionIsEligible(
  action: TerritorialActionFact,
  participation: TerritorialParticipationFact,
  consent: TerritorialLegendConsent,
  now: Date,
  privateOwner: boolean,
): boolean {
  const actionAt = parseActionDate(action.actionDate);
  if (!actionAt) return false;
  const start = windowStart(now);
  const currentParisDate = parisDate(now);
  if (actionAt < start || action.actionDate > currentParisDate) return false;
  if (campaignYearForCivilDate(action.actionDate) !== campaignYearForCivilDate(currentParisDate)) return false;
  if ((!privateOwner && (!consent.enabled || consent.ageEligible === false)) || !consent.activatedAt) return false;
  const activatedAt = new Date(consent.activatedAt);
  if (Number.isNaN(activatedAt.getTime())) return false;
  const joinedAt = new Date(participation.joinedAt);
  if (Number.isNaN(joinedAt.getTime())) return false;
  // The confirmed participation timestamp is the contribution boundary. A
  // civil action date alone cannot distinguish an earlier same-day contribution.
  return joinedAt.getTime() >= activatedAt.getTime();
}

export function buildTerritorialLegendPage(params: BuildLeaderboardParams): TerritorialLegendPage {
  const now = params.now ?? new Date();
  const targetCode = params.territoryCode.trim();
  const internal = buildRankedEntries(params);
  const offset = Math.min(decodeCursor(params.cursor), internal.length);
  const limit = Math.max(1, Math.min(100, Math.trunc(params.limit ?? 25)));
  const items = internal.slice(offset, offset + limit).map((item) => ({
    rank: item.rank,
    publicLabel: item.publicLabel,
    score: item.score,
    distinctActions: item.distinctActions,
    tied: item.tied,
    tieSize: item.tieSize,
  }));
  const nextCursor = offset + items.length < internal.length ? encodeCursor(offset + items.length) : null;
  const maxScore = internal[0]?.score ?? 0;
  const titleEligible = internal.length >= 2 && maxScore >= 2;
  const label = params.territoryLabel?.trim() || null;
  const campaignYear = campaignYearForCivilDate(parisDate(now));

  const publicOwner = params.ownerUserId
    ? internal.find((item) => item.userId === params.ownerUserId) ?? null
    : null;
  const privateOwner = params.ownerUserId && !publicOwner
    ? buildRankedEntries(params, { includeOwnerPrivate: true }).find((item) => item.userId === params.ownerUserId) ?? null
    : publicOwner;
  return {
    level: params.level,
    campaignYear,
    territoryCode: targetCode,
    territoryLabel: label,
    generatedAt: now.toISOString(),
    windowDays: TERRITORIAL_LEGEND_WINDOW_DAYS,
    competitorCount: internal.length,
    maxScore,
    titleEligible,
    title: titleEligible && label ? `Légende de ${label}` : null,
    items,
    nextCursor,
    ...(params.ownerUserId
      ? {
          owner: privateOwner
            ? {
                rank: publicOwner?.rank ?? null,
                score: privateOwner.score,
                distinctActions: privateOwner.distinctActions,
                tied: publicOwner?.tied ?? false,
                tieSize: publicOwner?.tieSize ?? 1,
              }
            : null,
        }
      : {}),
  };
}

export function buildTerritorialLegendWinnerSnapshots(params: {
  now?: Date;
  actions: readonly TerritorialActionFact[];
  participations: readonly TerritorialParticipationFact[];
  consents: readonly TerritorialLegendConsent[];
  profiles: readonly TerritorialPublicProfile[];
}): TerritorialLegendWinnerSnapshot[] {
  const now = params.now ?? new Date();
  const snapshots: TerritorialLegendWinnerSnapshot[] = [];
  for (const level of TERRITORIAL_LEGEND_LEVELS) {
    const territoryParts = new Map<string, TerritorialPart>();
    for (const action of params.actions) {
      const part = territoryPartForLevel(action, level);
      if (part) territoryParts.set(part.code, part);
    }
    for (const [territoryCode, territoryPart] of territoryParts) {
      const ranked = buildRankedEntries({ ...params, now, level, territoryCode });
      const maxScore = ranked[0]?.score ?? 0;
      if (ranked.length < 2 || maxScore < 2) continue;
      for (const winner of ranked.filter((entry) => entry.rank === 1)) {
        snapshots.push({
          userId: winner.userId,
          campaignYear: campaignYearForDate(now),
          level,
          territoryCode,
          territoryLabel: territoryPart.name,
          effectiveOn: parisDate(now),
          score: winner.score,
          rank: 1,
          tieSize: winner.tieSize,
          sourceFingerprint: [campaignYearForDate(now), level, territoryCode, winner.userId, winner.actionIds.join(","), winner.score, winner.tieSize].join("|"),
        });
      }
    }
  }
  return snapshots.sort((left, right) =>
    left.level.localeCompare(right.level) ||
    left.territoryCode.localeCompare(right.territoryCode) ||
    left.userId.localeCompare(right.userId),
  );
}

function campaignYearForDate(value: Date): number {
  return campaignYearForCivilDate(parisDate(value));
}

type RawActionRow = {
  id: string;
  action_date: string;
  territorial_legend_attribution: unknown;
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

export async function loadTerritorialLegendFacts(
  supabase: SupabaseClient,
  params: { now?: Date; ownerUserId?: string | null } = {},
): Promise<TerritorialLegendLoadedFacts> {
  const now = params.now ?? new Date();
  const start = parisDate(windowStart(now));
  const actionRows = await loadTerritorialLegendPages({
    resource: "actions",
    loadPage: async (from, to) => {
      const result = await supabase
        .from("actions")
        .select("id, action_date, territorial_legend_attribution")
        .eq("status", "approved")
        .eq("action_phase", "post_action_complete")
        .not("published_at", "is", null)
        .eq("moderation_visibility", "visible")
        .eq("access_mode", "public")
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
  if (actions.length === 0) return {
    actions: [],
    participations: [],
    consents: [],
    profiles: [],
    clerkEligibilityUnavailableUserIds: [],
  };

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
  const userIds = [...new Set(participations.map((row) => row.userId).filter(Boolean))];
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
  const clerkEligibility = await Promise.all(consentResult.filter((consent) => consent.enabled).map(async (consent) => {
    const eligibility = await getUserOptionalConsentEligibility(consent.userId);
    return {
      userId: consent.userId,
      available: eligibility.status === "verified",
      ageEligible: eligibility.status === "verified" && isOptionalConsentTreatmentAllowed(eligibility),
    };
  }));
  const clerkEligibilityUnavailableUserIds = clerkEligibility
    .filter((consent) => !consent.available)
    .map((consent) => consent.userId);
  const publicConsentIds = new Set(
    clerkEligibility.filter((consent) => consent.ageEligible).map((consent) => consent.userId),
  );
  const ownerUserId = params.ownerUserId ?? null;
  const eligibleUserIds = [...new Set([
    ...publicConsentIds,
    ...(ownerUserId && userIds.includes(ownerUserId) ? [ownerUserId] : []),
  ])];
  for (const consent of consentResult) {
    if (consent.enabled) {
      const currentEligibility = clerkEligibility.find((entry) => entry.userId === consent.userId);
      consent.ageEligible = currentEligibility?.available
        ? publicConsentIds.has(consent.userId)
        : false;
    }
  }
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
    return params.ownerUserId === row.id ? [{ userId: row.id, publicLabel: "Vous" }] : [];
  });
  return {
    actions,
    participations,
    consents: consentResult,
    profiles,
    clerkEligibilityUnavailableUserIds,
  };
}

export async function loadTerritorialLegendPage(
  supabase: SupabaseClient,
  params: Omit<BuildLeaderboardParams, "actions" | "participations" | "consents" | "profiles"> & { now?: Date },
): Promise<TerritorialLegendPage> {
  const now = params.now ?? new Date();
  const facts = await loadTerritorialLegendFacts(supabase, {
    now,
    ownerUserId: params.ownerUserId,
  });
  const resolvedTerritoryLabel = params.territoryLabel ?? facts.actions
    .map((action) => territoryPartForLevel(action, params.level))
    .find((part) => part?.code === params.territoryCode)?.name ?? null;
  return buildTerritorialLegendPage({
    ...params,
    territoryLabel: resolvedTerritoryLabel,
    now,
    ...facts,
  });
}

export function validateTerritorialLegendLevel(value: string): value is TerritorialLegendLevel {
  return (TERRITORIAL_LEGEND_LEVELS as readonly string[]).includes(value);
}

export function validateTerritorialLegendCode(
  level: TerritorialLegendLevel,
  value: string,
): boolean {
  if (level === "country") return value === "FR";
  if (level === "region") return /^\d{2}$/.test(value);
  if (level === "department") return /^(?:\d{2,3}|2A|2B)$/.test(value);
  return /^\d{5}$/.test(value);
}
