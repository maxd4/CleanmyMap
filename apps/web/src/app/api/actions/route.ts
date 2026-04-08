import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ACTION_STATUSES, type ActionStatus } from "@/lib/actions/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createActionSchema } from "@/lib/validation/action";
import { createAction, fetchActions } from "@/lib/actions/store";
import { getCurrentUserIdentity, pickTraceableActorName } from "@/lib/authz";

export const runtime = "nodejs";

function parseStatusParam(raw: string | null): ActionStatus | null {
  if (!raw) {
    return null;
  }
  return ACTION_STATUSES.includes(raw as ActionStatus) ? (raw as ActionStatus) : null;
}

function parsePositiveInteger(raw: string | null, min: number, max: number, fallback: number): number {
  if (raw === null || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 200, 30);
  const status = parseStatusParam(url.searchParams.get("status"));

  try {
    const supabase = getSupabaseServerClient();
    const items = await fetchActions(supabase, { limit, status });
    return NextResponse.json({ status: "ok", source: "actions", count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
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
    const created = await createAction(supabase, { userId, payload: normalizedPayload });
    return NextResponse.json({ status: "created", id: created.id, source: "actions" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
