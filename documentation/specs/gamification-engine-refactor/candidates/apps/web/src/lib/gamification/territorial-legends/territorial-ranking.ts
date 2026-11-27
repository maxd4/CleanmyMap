import { campaignYearForCivilDate } from "./campaign";
import { TERRITORIAL_LEGEND_WINDOW_DAYS, parisDate, parseActionDate, windowStart } from "./territorial-window";
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

export function territoryPartForLevel(
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
