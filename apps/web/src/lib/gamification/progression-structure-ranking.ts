import type { SupabaseClient } from "@supabase/supabase-js";
import { isOrganizerType } from "@/lib/actions/organizer-type";
import { runActionQuery } from "@/lib/actions/query";
import { ACTION_SELECT_FIELDS_WITH_PHASE } from "@/lib/actions/store-selects";
import { isCurrentActionValidated } from "./action-milestones";
import { buildInfiniteGemGradeCatalog, ORGANISATION_GEM_CONFIG } from "./gem-progression";
import { countCurrentLeaderboardBadgeFacts } from "./leaderboard-badges";
import { computePotentialLevel } from "./progression-formulas";
import { compareLeaderboardItems } from "./progression-ranking-comparison";
import type {
  ActionRow,
  LeaderboardMetric,
  PublicLeaderboardItem,
  PublicStructureLeaderboardItem,
} from "./progression-types";

const PUBLIC_LEADERBOARD_LIMIT = 60;

export type StructureProgressionEvent = {
  id?: number | string | null;
  event_type?: string | null;
  source_table?: string | null;
  source_id?: string | null;
  status_phase?: string | null;
  xp_awarded?: number | string | null;
};

type StructureIdentity = {
  id: string;
  label: string;
  type: NonNullable<ActionRow["organizer_type"]>;
};

type StructureAggregate = {
  identity: StructureIdentity;
  validatedXp: number;
  validatedActions: number;
};

function structureIdentity(
  row: Pick<ActionRow, "organizer_type" | "organizer_id" | "organizer_name">,
): StructureIdentity | null {
  const id = row.organizer_id?.trim() ?? "";
  const label = row.organizer_name?.trim() ?? "";
  if (
    !id ||
    !label ||
    row.organizer_type === "spontaneous" ||
    !isOrganizerType(row.organizer_type)
  ) {
    return null;
  }
  return { id, label, type: row.organizer_type };
}

function isStructureEvent(event: StructureProgressionEvent): boolean {
  if (event.source_table !== "actions" || event.status_phase !== "validated") {
    return false;
  }
  const eventType = event.event_type?.toLowerCase() ?? "";
  return !["quiz", "learning", "moderation", "referral"].some((family) =>
    eventType.includes(family),
  );
}

function eventIdentity(event: StructureProgressionEvent): string | null {
  if (event.id !== null && event.id !== undefined && String(event.id).trim()) {
    return `id:${String(event.id)}`;
  }
  if (!event.event_type || !event.source_id) return null;
  return `logical:${event.event_type}:${event.source_table ?? ""}:${event.source_id}:${event.status_phase ?? ""}`;
}

function toNonNegativeNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function structureBadges(validatedActions: number) {
  const grades = buildInfiniteGemGradeCatalog(
    validatedActions,
    ORGANISATION_GEM_CONFIG,
  )
    .filter((grade) => grade.threshold > 0 && grade.threshold <= validatedActions)
    .map((grade) => grade.id);

  // No current one-shot has a structure-owned proof. Personal, learning,
  // moderation and referral facts are deliberately excluded from this scope.
  return countCurrentLeaderboardBadgeFacts({ gradeIds: grades, oneShotIds: [] });
}

function toPublicStructureItem(
  value: StructureAggregate,
): PublicStructureLeaderboardItem {
  return {
    rank: 0,
    publicLabel: value.identity.label,
    structureType: value.identity.type,
    level: computePotentialLevel(value.validatedXp),
    xpValidated: value.validatedXp,
    ...structureBadges(value.validatedActions),
  };
}

export function buildStructureLeaderboardCandidates(
  actionRows: readonly ActionRow[],
  events: readonly StructureProgressionEvent[],
  metric: LeaderboardMetric,
): PublicLeaderboardItem[] {
  const actionsById = new Map<string, StructureIdentity>();
  const aggregates = new Map<string, StructureAggregate>();

  for (const action of actionRows) {
    if (!isCurrentActionValidated(action)) continue;
    const identity = structureIdentity(action);
    if (!identity) continue;

    actionsById.set(action.id, identity);
    const current = aggregates.get(identity.id) ?? {
      identity,
      validatedXp: 0,
      validatedActions: 0,
    };
    current.validatedActions += 1;
    aggregates.set(identity.id, current);
  }

  const seenEvents = new Set<string>();
  for (const event of events) {
    if (!isStructureEvent(event)) continue;
    const identity = eventIdentity(event);
    const structure = event.source_id ? actionsById.get(event.source_id) : null;
    if (!identity || !structure || seenEvents.has(identity)) continue;
    seenEvents.add(identity);
    const aggregate = aggregates.get(structure.id);
    if (aggregate) aggregate.validatedXp += toNonNegativeNumber(event.xp_awarded);
  }

  return [...aggregates.values()]
    .map(toPublicStructureItem)
    .sort((left, right) => compareLeaderboardItems(left, right, metric))
    .slice(0, PUBLIC_LEADERBOARD_LIMIT)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

async function loadStructureActionRows(supabase: SupabaseClient): Promise<ActionRow[]> {
  return runActionQuery<ActionRow>(supabase, (query) =>
    query
      .select(ACTION_SELECT_FIELDS_WITH_PHASE)
      .eq("status", "approved")
      .order("action_date", { ascending: false })
      .limit(10000),
  );
}

async function loadStructureProgressionEvents(
  supabase: SupabaseClient,
): Promise<StructureProgressionEvent[]> {
  const result = await supabase
    .from("progression_events")
    .select("id, event_type, source_table, source_id, status_phase, xp_awarded")
    .eq("source_table", "actions")
    .eq("status_phase", "validated")
    .limit(50000);
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as StructureProgressionEvent[];
}

export async function buildPublicStructureLeaderboard(
  supabase: SupabaseClient,
  metric: LeaderboardMetric,
): Promise<PublicLeaderboardItem[]> {
  const [actions, events] = await Promise.all([
    loadStructureActionRows(supabase),
    loadStructureProgressionEvents(supabase),
  ]);
  return buildStructureLeaderboardCandidates(actions, events, metric);
}
