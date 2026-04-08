import { NextResponse } from "next/server";
import { ACTION_STATUSES, type ActionStatus } from "@/lib/actions/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchActions } from "@/lib/actions/store";
import { loadLocalMapItems } from "@/lib/data/map-records";
import { parseDrawingFromNotes, toGeoJsonString } from "@/lib/actions/drawing";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";

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

function buildDateFloor(daysWindow: number): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (daysWindow - 1));
  return now.toISOString().slice(0, 10);
}

function normalizeStatus(raw: string): "pending" | "approved" | "rejected" {
  if (raw === "approved" || raw === "rejected") {
    return raw;
  }
  return "pending";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 300, 80);
  const days = parsePositiveInteger(url.searchParams.get("days"), 1, 3650, 30);
  const status = parseStatusParam(url.searchParams.get("status"));
  const floorDate = buildDateFloor(days);

  try {
    const supabase = getSupabaseServerClient();
    const remote = await fetchActions(supabase, {
      limit,
      status,
      floorDate,
      requireCoordinates: true,
    });
    const localItems = await loadLocalMapItems({ status, floorDate, limit });
    const remoteItems = remote.map((row) => {
      const parsedNotes = parseDrawingFromNotes(row.notes);
      const contract = buildActionDataContract({
        id: row.id,
        type: "action",
        status: normalizeStatus(row.status),
        source: "actions",
        observedAt: row.action_date,
        createdAt: row.created_at,
        locationLabel: row.location_label,
        latitude: row.latitude,
        longitude: row.longitude,
        wasteKg: row.waste_kg,
        cigaretteButts: row.cigarette_butts,
        volunteersCount: row.volunteers_count,
        durationMinutes: row.duration_minutes,
        actorName: row.actor_name,
        notes: row.notes,
        notesPlain: parsedNotes.cleanNotes,
        manualDrawing: parsedNotes.manualDrawing,
        manualDrawingGeoJson: toGeoJsonString(parsedNotes.manualDrawing),
      });
      return toActionMapItem(contract);
    });
    const mergedItems = [...remoteItems, ...localItems]
      .filter((item) => item.latitude !== null && item.longitude !== null)
      .sort((a, b) => b.action_date.localeCompare(a.action_date))
      .slice(0, limit);

    return NextResponse.json({
      status: "ok",
      source: "actions+local",
      count: mergedItems.length,
      daysWindow: days,
      items: mergedItems,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
