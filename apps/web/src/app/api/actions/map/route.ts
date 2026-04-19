import { NextResponse } from "next/server";
import { ACTION_STATUSES, type ActionStatus } from "@/lib/actions/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toActionMapItem } from "@/lib/actions/data-contract";
import {
  fetchUnifiedActionContracts,
  parseEntityTypesParam,
} from "@/lib/actions/unified-source";
import { buildActionInsights } from "@/lib/actions/insights";

export const runtime = "nodejs";

function parseStatusParam(raw: string | null): ActionStatus | null {
  if (!raw || raw.trim() === "") {
    return "approved";
  }
  if (raw === "all") {
    return null;
  }
  return ACTION_STATUSES.includes(raw as ActionStatus)
    ? (raw as ActionStatus)
    : "approved";
}

function parsePositiveInteger(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (raw === null || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function buildDateFloor(daysWindow: number): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (daysWindow - 1));
  return now.toISOString().slice(0, 10);
}

function parseQualityMin(raw: string | null): number | null {
  if (!raw || raw.trim() === "") {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function parseAssociationParam(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const value = raw.trim();
  if (!value) {
    return null;
  }
  return value.slice(0, 120);
}

const IMPACT_LEVELS = ["faible", "moyen", "fort", "critique"] as const;
function parseImpactParam(
  raw: string | null,
): (typeof IMPACT_LEVELS)[number] | null {
  if (!raw) {
    return null;
  }
  return IMPACT_LEVELS.includes(raw as (typeof IMPACT_LEVELS)[number])
    ? (raw as (typeof IMPACT_LEVELS)[number])
    : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 300, 80);
  const days = parsePositiveInteger(url.searchParams.get("days"), 1, 3650, 30);
  const status = parseStatusParam(url.searchParams.get("status"));
  const types = parseEntityTypesParam(url.searchParams.get("types"));
  const qualityMin = parseQualityMin(url.searchParams.get("qualityMin"));
  const impact = parseImpactParam(url.searchParams.get("impact"));
  const association = parseAssociationParam(
    url.searchParams.get("association"),
  );
  const floorDate = buildDateFloor(days);

  try {
    const supabase = getSupabaseServerClient();
    const result = await fetchUnifiedActionContracts(supabase, {
      limit: Math.max(limit * 4, limit),
      status,
      floorDate,
      requireCoordinates: true,
      types,
    });
    const now = new Date();
    const items = result.items
      .map((contract) => {
        const insights = buildActionInsights(contract, now);
        return toActionMapItem(contract, insights);
      })
      .filter((item) => {
        if (association) {
          const itemAssociation =
            item.contract?.metadata.associationName?.trim().toLowerCase() ?? "";
          if (itemAssociation !== association.toLowerCase()) {
            return false;
          }
        }
        if (impact && item.impact_level !== impact) {
          return false;
        }
        if (
          qualityMin !== null &&
          Number(item.quality_score ?? 0) < qualityMin
        ) {
          return false;
        }
        return true;
      })
      .slice(0, limit);

    return NextResponse.json({
      status: "ok",
      source: "unified_actions",
      count: items.length,
      daysWindow: days,
      items,
      sourceHealth: result.sourceHealth,
      partialSource: result.sourceHealth.partial,
    }, result.sourceHealth.partial
      ? {
          headers: {
            "X-Data-Warning": "Partial source data",
          },
        }
      : undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
