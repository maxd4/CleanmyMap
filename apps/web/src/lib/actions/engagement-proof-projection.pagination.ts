import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readAllSpogomiPages,
  SPOGOMI_QUERY_PAGE_SIZE,
} from "@/lib/spogomi/pagination";

export const ENGAGEMENT_QUERY_PAGE_SIZE = SPOGOMI_QUERY_PAGE_SIZE;
export const ENGAGEMENT_ID_BATCH_SIZE = 200;
export const MAX_ENGAGEMENT_SOURCE_ROWS = 10_000;

export type EngagementSourceName =
  | "actionParticipants"
  | "actions"
  | "actionRoleAttestations"
  | "spogomiEquivalence";

export class EngagementProofReadError extends Error {
  readonly failedSource: EngagementSourceName;

  constructor(
    failedSource: EngagementSourceName,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "EngagementProofReadError";
    this.failedSource = failedSource;
  }
}

export type BoundedPageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
};

export function chunkIds(
  ids: readonly string[],
  batchSize = ENGAGEMENT_ID_BATCH_SIZE,
): string[][] {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const batches: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += batchSize) {
    batches.push(uniqueIds.slice(index, index + batchSize));
  }
  return batches;
}

export async function readAllBoundedPages<T>(params: {
  source: EngagementSourceName;
  label: string;
  maxRows?: number;
  pageSize?: number;
  loadPage: (from: number, to: number) => PromiseLike<BoundedPageResult<T>>;
}): Promise<T[]> {
  const maxRows = params.maxRows ?? MAX_ENGAGEMENT_SOURCE_ROWS;
  const pageSize = params.pageSize ?? ENGAGEMENT_QUERY_PAGE_SIZE;
  const rows: T[] = [];
  let expectedCount: number | null = null;

  for (let from = 0; ; from += pageSize) {
    const result = await params.loadPage(from, from + pageSize - 1);
    if (result.error) {
      throw new EngagementProofReadError(params.source, result.error.message, {
        cause: result.error,
      });
    }
    if (!Array.isArray(result.data)) {
      throw new EngagementProofReadError(
        params.source,
        `La lecture paginée (${params.label}) est incomplète.`,
      );
    }
    if (typeof result.count !== "number" || !Number.isInteger(result.count) || result.count < 0) {
      throw new EngagementProofReadError(
        params.source,
        `Le décompte exact (${params.label}) est indisponible.`,
      );
    }
    if (expectedCount === null) {
      expectedCount = result.count;
      if (expectedCount > maxRows) {
        throw new EngagementProofReadError(
          params.source,
          `La source (${params.label}) dépasse la borne maximale autorisée (${maxRows}).`,
        );
      }
    } else if (result.count !== expectedCount) {
      throw new EngagementProofReadError(
        params.source,
        `La cardinalité (${params.label}) a changé pendant la pagination.`,
      );
    }

    rows.push(...result.data);
    if (rows.length > maxRows) {
      throw new EngagementProofReadError(
        params.source,
        `La source (${params.label}) dépasse la borne maximale autorisée (${maxRows}).`,
      );
    }

    if (rows.length === expectedCount) {
      return rows;
    }
    if (
      rows.length > expectedCount ||
      result.data.length === 0 ||
      result.data.length < pageSize
    ) {
      throw new EngagementProofReadError(
        params.source,
        `La lecture paginée (${params.label}) est tronquée ou incohérente.`,
      );
    }
  }
}

export async function readAllBoundedSpogomiPages<T>(params: {
  label: string;
  maxRows?: number;
  loadPage: (from: number, to: number) => PromiseLike<BoundedPageResult<T>>;
}): Promise<T[]> {
  const maxRows = params.maxRows ?? MAX_ENGAGEMENT_SOURCE_ROWS;
  try {
    const rows = await readAllSpogomiPages(
      params.label,
      async (from, to) => {
        const result = await params.loadPage(from, to);
        if (
          typeof result.count === "number" &&
          Number.isInteger(result.count) &&
          result.count > maxRows
        ) {
          throw new EngagementProofReadError(
            "spogomiEquivalence",
            `La source (${params.label}) dépasse la borne maximale autorisée (${maxRows}).`,
          );
        }
        return result;
      },
      { requireExactCount: true },
    );
    if (rows.length > maxRows) {
      throw new EngagementProofReadError(
        "spogomiEquivalence",
        `La source (${params.label}) dépasse la borne maximale autorisée (${maxRows}).`,
      );
    }
    return rows;
  } catch (error) {
    if (error instanceof EngagementProofReadError) {
      throw error;
    }
    throw new EngagementProofReadError(
      "spogomiEquivalence",
      error instanceof Error ? error.message : `Échec de lecture paginée (${params.label}).`,
      { cause: error },
    );
  }
}

export function assertAllActionIdsLoaded(
  supabaseResultActions: readonly { id: string }[],
  requestedIds: readonly string[],
): void {
  const loadedIds = new Set(supabaseResultActions.map((row) => row.id));
  if (
    loadedIds.size !== supabaseResultActions.length ||
    requestedIds.some((id) => !loadedIds.has(id))
  ) {
    throw new EngagementProofReadError(
      "actions",
      "La lecture des actions est incomplète ou incohérente.",
    );
  }
}

export type SupabaseRangeQuery = {
  order: (col: string, opts: { ascending: boolean }) => {
    range: (from: number, to: number) => PromiseLike<BoundedPageResult<unknown>>;
  };
};

export type SupabaseClientLike = SupabaseClient;
