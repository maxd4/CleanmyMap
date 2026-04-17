import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ACTION_STATUSES, type ActionStatus } from "@/lib/actions/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createActionSchema } from "@/lib/validation/action";
import { createAction } from "@/lib/actions/store";
import { getCurrentUserIdentity, pickTraceableActorName } from "@/lib/authz";
import { toActionListItem } from "@/lib/actions/data-contract";
import {
  fetchUnifiedActionContracts,
  parseEntityTypesParam,
} from "@/lib/actions/unified-source";
import { buildActionInsights } from "@/lib/actions/insights";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
const QUALITY_GRADES = ["A", "B", "C"] as const;
const IMPACT_LEVELS = ["faible", "moyen", "fort", "critique"] as const;

function parseStatusParam(raw: string | null): ActionStatus | null {
  if (!raw) {
    return null;
  }
  return ACTION_STATUSES.includes(raw as ActionStatus)
    ? (raw as ActionStatus)
    : null;
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

function parseQualityGradeParam(
  raw: string | null,
): (typeof QUALITY_GRADES)[number] | null {
  if (!raw) {
    return null;
  }
  return QUALITY_GRADES.includes(raw as (typeof QUALITY_GRADES)[number])
    ? (raw as (typeof QUALITY_GRADES)[number])
    : null;
}

function parseBooleanFlag(raw: string | null): boolean | null {
  if (!raw) {
    return null;
  }
  const value = raw.trim().toLowerCase();
  if (value === "1" || value === "true" || value === "yes") {
    return true;
  }
  if (value === "0" || value === "false" || value === "no") {
    return false;
  }
  return null;
}

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 200, 30);
  const status = parseStatusParam(url.searchParams.get("status"));
  const daysRaw = url.searchParams.get("days");
  const days =
    daysRaw === null ? null : parsePositiveInteger(daysRaw, 1, 3650, 90);
  const floorDate = days === null ? null : buildDateFloor(days);
  const types = parseEntityTypesParam(url.searchParams.get("types"));
  const qualityGrade = parseQualityGradeParam(
    url.searchParams.get("qualityGrade"),
  );
  const toFixPriority = parseBooleanFlag(url.searchParams.get("toFixPriority"));
  const impact = parseImpactParam(url.searchParams.get("impact"));
  const association = parseAssociationParam(
    url.searchParams.get("association"),
  );

  try {
    const supabase = getSupabaseServerClient();
    const result = await fetchUnifiedActionContracts(supabase, {
      limit: Math.max(limit * 4, limit),
      status,
      floorDate,
      requireCoordinates: false,
      types,
    });
    const now = new Date();
    const items = result.items
      .map((contract) => {
        const insights = buildActionInsights(contract, now);
        return toActionListItem(contract, insights);
      })
      .filter((item) => {
        if (qualityGrade && item.quality_grade !== qualityGrade) {
          return false;
        }
        if (
          toFixPriority !== null &&
          Boolean(item.to_fix_priority) !== toFixPriority
        ) {
          return false;
        }
        if (impact && item.impact_level !== impact) {
          return false;
        }
        if (association) {
          const itemAssociation =
            item.association_name?.trim().toLowerCase() ?? "";
          if (itemAssociation !== association.toLowerCase()) {
            return false;
          }
        }
        return true;
      })
      .slice(0, limit);
    return NextResponse.json({
      status: "ok",
      source: "unified_actions",
      count: items.length,
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

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = createActionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const identity = await getCurrentUserIdentity();
    const actorName = pickTraceableActorName(identity, parsed.data.actorName);
    const normalizedPayload = {
      ...parsed.data,
      actorName,
    };
    const created = await createAction(supabase, {
      userId,
      payload: normalizedPayload,
    });
    return NextResponse.json(
      { status: "created", id: created.id, source: "actions" },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
