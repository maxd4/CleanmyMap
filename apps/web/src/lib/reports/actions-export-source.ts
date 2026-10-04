import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionEntityType } from "@/lib/actions/contracts/contract-model";
import {
  fetchUnifiedActionContracts,
  parseEntityTypesParam,
} from "@/lib/actions/unified-source";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildDateFloor, resolveReportQuery, type ReportQuery } from "./csv";
import { filterActionContractsByScope } from "./scope";

export function buildActionsExportCachePath(params: {
  format: "csv" | "json";
  cacheDay: string;
  query: ReportQuery;
  types: readonly string[] | null;
}): string {
  const cacheKey = createHash("sha1")
    .update(
      JSON.stringify({
        cacheDay: params.cacheDay,
        days: params.query.days,
        limit: params.query.limit,
        status: params.query.status,
        scopeKind: params.query.scopeKind,
        scopeValue: params.query.scopeValue,
        association: params.query.association,
        types: params.types ? [...params.types].sort() : null,
      }),
    )
    .digest("hex")
    .slice(0, 16);

  return `actions-${params.format}/${params.cacheDay}/${cacheKey}.${params.format}`;
}

export const ACTIONS_EXPORT_BUCKET = "reports";
export const ACTIONS_EXPORT_RESPONSE_CACHE_CONTROL =
  "private, max-age=300, stale-while-revalidate=86400";
const ACTIONS_EXPORT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export type ActionsExportRequestContext = {
  query: ReportQuery;
  types: ActionEntityType[] | null;
  exportDate: Date;
  cacheDay: string;
  supabase: SupabaseClient;
};

export function prepareActionsExportContext(
  request: Request,
): ActionsExportRequestContext {
  const url = new URL(request.url);
  const exportDate = new Date();
  return {
    query: resolveReportQuery(url),
    types: parseEntityTypesParam(url.searchParams.get("types")),
    exportDate,
    cacheDay: exportDate.toISOString().slice(0, 10),
    supabase: getSupabaseServerClient(true),
  };
}

export async function createActionsExportRedirect(params: {
  supabase: SupabaseClient;
  path: string;
  filename: string;
  cacheControl: string;
}): Promise<Response | null> {
  const { data, error } = await params.supabase.storage
    .from(ACTIONS_EXPORT_BUCKET)
    .createSignedUrl(params.path, ACTIONS_EXPORT_SIGNED_URL_TTL_SECONDS, {
      download: params.filename,
    });

  if (error || !data?.signedUrl) {
    return null;
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: data.signedUrl,
      "Cache-Control": params.cacheControl,
    },
  });
}

async function loadActionsExportContracts(
  supabase: SupabaseClient,
  query: ReportQuery,
  types: ActionEntityType[] | null,
) {
  const { items: contracts, isTruncated, sourceHealth } =
    await fetchUnifiedActionContracts(supabase, {
      limit: Math.min(Math.max(query.limit * 2, query.limit), 1000),
      status: query.status,
      floorDate: buildDateFloor(query.days),
      requireCoordinates: false,
      types,
    });

  return {
    contracts: filterActionContractsByScope(contracts, {
      kind: query.scopeKind,
      value:
        query.scopeKind === "association"
          ? query.scopeValue ?? query.association
          : query.scopeValue,
    }),
    isTruncated,
    sourceHealth,
  };
}

export function loadActionsExportContractsForContext(
  context: ActionsExportRequestContext,
) {
  return loadActionsExportContracts(context.supabase, context.query, context.types);
}
