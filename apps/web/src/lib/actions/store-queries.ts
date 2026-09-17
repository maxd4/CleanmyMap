import type { ActionMapViewportQuery, ActionStatus } from "@/lib/actions/types";
import type { ActionRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionQuery } from "@/lib/actions/query";
import { runActionQuery, runSingleActionQuery } from "@/lib/actions/query";
import { getActionParisDate, isPublishedFuturePreAction } from "./temporal";
import {
  ACTION_SELECT_FIELDS_LEGACY,
  ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT,
  ACTION_SELECT_FIELDS_WITH_PHASE,
  isMissingActionColumnError,
} from "./store-selects";
import { normalizeStoredAction } from "./store-normalization";

const ACTION_RESUME_SELECT_FIELDS = [
  "id",
  "created_by_clerk_id",
  "action_date",
  "event_start_time",
  "status",
  "published_at",
  "moderation_visibility",
  "action_phase",
].join(", ");

export type ActionResumeRow = Pick<
  ActionRow,
  | "id"
  | "created_by_clerk_id"
  | "action_date"
  | "event_start_time"
  | "status"
  | "published_at"
  | "moderation_visibility"
  | "action_phase"
>;

type ActionListParams = {
  actionId?: string | null;
  limit: number | null;
  status: ActionStatus | null;
  includeFuturePublicActions?: boolean;
  futureOnly?: boolean;
  floorDate?: string;
  requireCoordinates?: boolean;
  viewport?: ActionMapViewportQuery;
};

function buildActionListQuery(
  query: ActionQuery,
  params: ActionListParams,
  selectFields: string,
) {
  let nextQuery = query
    .select(selectFields)
    .order("action_date", { ascending: false });
  if (params.limit !== null) {
    nextQuery = nextQuery.limit(params.limit);
  }
  if (params.actionId) {
    nextQuery = nextQuery.eq("id", params.actionId);
  }

  if (selectFields.includes("moderation_visibility")) {
    nextQuery = nextQuery.eq("moderation_visibility", "visible");
  }

  if (params.includeFuturePublicActions && params.status === "approved") {
    const today = getActionParisDate();
    nextQuery = nextQuery.or(
      `and(status.eq.approved,action_phase.neq.pre_action),and(action_phase.eq.pre_action,published_at.not.is.null,status.in.(approved,pending),action_date.gte.${today})`,
    );
  } else if (params.status === "approved" && selectFields.includes("action_phase")) {
    // Public approved reads must never expose an unclassified/private
    // pre-action, regardless of the creator's role.
    nextQuery = nextQuery.eq("status", "approved").or("action_phase.neq.pre_action");
  } else if (params.status) {
    nextQuery = nextQuery.eq("status", params.status);
  }
  if (params.floorDate) {
    nextQuery = nextQuery.gte("action_date", params.floorDate);
  }
  if (params.requireCoordinates) {
    nextQuery = nextQuery.not("latitude", "is", null).not("longitude", "is", null);
  }
  if (params.viewport) {
    nextQuery = nextQuery
      .gte("latitude", params.viewport.south)
      .lte("latitude", params.viewport.north)
      .gte("longitude", params.viewport.west)
      .lte("longitude", params.viewport.east);
  }

  return nextQuery;
}

export async function fetchActionRows(
  supabase: SupabaseClient,
  params: ActionListParams,
): Promise<ActionRow[]> {
  try {
    const rows = await runActionQuery<ActionRow>(supabase, (query) =>
      buildActionListQuery(query, params, ACTION_SELECT_FIELDS_WITH_PHASE),
    );
    const normalized = rows.map(normalizeStoredAction);
    return params.futureOnly
      ? normalized.filter((row) => isPublishedFuturePreAction(row))
      : normalized;
  } catch (error) {
    if (!isMissingActionColumnError(error)) {
      throw error;
    }

    try {
      const rows = await runActionQuery<ActionRow>(supabase, (query) =>
        buildActionListQuery(
          query,
          { ...params, includeFuturePublicActions: false },
          ACTION_SELECT_FIELDS_LEGACY,
        ),
      );
      const normalized = rows.map(normalizeStoredAction);
      return params.futureOnly
        ? normalized.filter((row) => isPublishedFuturePreAction(row))
        : normalized;
    } catch (legacyError) {
      if (!isMissingActionColumnError(legacyError)) {
        throw legacyError;
      }
      const rows = await runActionQuery<ActionRow>(supabase, (query) =>
        buildActionListQuery(
          query,
          { ...params, includeFuturePublicActions: false },
          ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT,
        ),
      );
      const normalized = rows.map(normalizeStoredAction);
      return params.futureOnly
        ? normalized.filter((row) => isPublishedFuturePreAction(row))
        : normalized;
    }
  }
}

export async function fetchActionRowById(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionRow | null> {
  try {
    const row = await runSingleActionQuery<ActionRow>(supabase, (query) =>
      query
        .select(ACTION_SELECT_FIELDS_WITH_PHASE)
        .eq("id", actionId)
        .maybeSingle(),
    );

    if (!row) {
      return null;
    }

    return normalizeStoredAction(row);
  } catch (error) {
    if (!isMissingActionColumnError(error)) {
      throw error;
    }

    let row: ActionRow | null;
    try {
      row = await runSingleActionQuery<ActionRow>(supabase, (query) =>
        query.select(ACTION_SELECT_FIELDS_LEGACY).eq("id", actionId).maybeSingle(),
      );
    } catch (legacyError) {
      if (!isMissingActionColumnError(legacyError)) {
        throw legacyError;
      }
      row = await runSingleActionQuery<ActionRow>(supabase, (query) =>
        query
          .select(ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT)
          .eq("id", actionId)
          .maybeSingle(),
      );
    }

    if (!row) {
      return null;
    }

    return normalizeStoredAction(row);
  }
}

export async function fetchActions(
  supabase: SupabaseClient,
  params: ActionListParams,
): Promise<ActionRow[]> {
  return fetchActionRows(supabase, params);
}

export async function fetchRecentActionsByUser(
  supabase: SupabaseClient,
  params: { userId: string; limit: number },
): Promise<ActionRow[]> {
  try {
    const rows = await runActionQuery<ActionRow>(supabase, (query) =>
      query
        .select(ACTION_SELECT_FIELDS_WITH_PHASE)
        .eq("created_by_clerk_id", params.userId)
        .order("action_date", { ascending: false })
        .limit(params.limit),
    );
    return rows.map(normalizeStoredAction);
  } catch (error) {
    if (!isMissingActionColumnError(error)) {
      throw error;
    }

    try {
      const rows = await runActionQuery<ActionRow>(supabase, (query) =>
        query
          .select(ACTION_SELECT_FIELDS_LEGACY)
          .eq("created_by_clerk_id", params.userId)
          .order("action_date", { ascending: false })
          .limit(params.limit),
      );
      return rows.map(normalizeStoredAction);
    } catch (legacyError) {
      if (!isMissingActionColumnError(legacyError)) {
        throw legacyError;
      }
      const rows = await runActionQuery<ActionRow>(supabase, (query) =>
        query
          .select(ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT)
          .eq("created_by_clerk_id", params.userId)
          .order("action_date", { ascending: false })
          .limit(params.limit),
      );
      return rows.map(normalizeStoredAction);
    }
  }
}

export async function loadActionById(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionRow | null> {
  return fetchActionRowById(supabase, actionId);
}

/**
 * Minimal action projection for resume-tab inference.
 * RLS remains the authorization boundary; callers must not replace this
 * client with a service-role client for anonymous requests.
 */
export async function loadActionResumeRowById(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionResumeRow | null> {
  return runSingleActionQuery<ActionResumeRow>(supabase, (query) =>
    query
      .select(ACTION_RESUME_SELECT_FIELDS)
      .eq("id", actionId)
      .maybeSingle(),
  );
}
