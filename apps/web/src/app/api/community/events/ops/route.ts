import { auth } from"@clerk/nextjs/server";
import { randomUUID } from"node:crypto";
import { NextResponse } from"next/server";
import { z } from"zod";
import { appendAdminOperationAudit } from"@/lib/admin/audit/operation-audit";
import { requireAdminAccess } from"@/lib/authz";
import { trackCommunityOpsUpdate } from"@/lib/gamification/progression";
import {
 defaultCommunityEventOps,
 mergeCommunityEventOps,
 parseCommunityEventDescription,
 serializeCommunityEventDescription,
} from"@/lib/community/event-ops";
import { toCommunityEventItem } from "@/lib/community/event-item";
import type { CommunityEventItem } from "@/lib/community/http";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { adminAccessErrorJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError } from"@/lib/http/api-errors";
import { loadCommunityEventRsvpSummaries } from"@/lib/community/event-rsvp-summaries";
import {
 communityEventLocationSchema,
 communityEventLocationToDatabase,
} from "@/lib/community/event-location";
import { revalidateCommunityEventCaches } from "@/lib/community/event-cache-invalidation";

export const runtime ="nodejs";
const updateEventOpsSchema = z
 .object({
 eventId: z.string().trim().min(1).max(120),
 capacityTarget: z.number().int().min(1).max(200000).nullable().optional(),
 attendanceCount: z.number().int().min(0).max(200000).nullable().optional(),
 postMortem: z.string().trim().max(6000).nullable().optional(),
 location: communityEventLocationSchema.nullable().optional(),
 reason: z.string().trim().max(500).optional(),
 })
 .strict();

type CommunityEventRow = {
 id: string;
 created_at: string;
 organizer_clerk_id: string;
 title: string;
 event_date: string;
 location_label: string;
 latitude: number | null;
 longitude: number | null;
 location_source: "manual" | "import" | null;
 description: string | null;
};

type CommunityEventOpsAuditValue = {
 capacityTarget: number | null;
 attendanceCount: number | null;
 postMortemPresent: boolean;
 postMortemLength: number;
};

const ADMIN_OVERRIDE_OPERATION = "update_community_event_ops_admin_override";

type UpdateEventOpsPayload = z.infer<typeof updateEventOpsSchema>;
type CommunityEventSupabase = ReturnType<typeof getSupabaseServerClient>;

function parseUpdateEventOpsPayload(payload: unknown):
  | { data: UpdateEventOpsPayload }
  | { response: NextResponse } {
  const parsed = updateEventOpsSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      ),
    };
  }
  return { data: parsed.data };
}

async function loadCommunityEvent(
  supabase: CommunityEventSupabase,
  eventId: string,
): Promise<CommunityEventRow | { response: NextResponse }> {
  const result = await supabase
    .from("community_events")
    .select(
      "id, created_at, organizer_clerk_id, title, event_date, location_label, latitude, longitude, location_source, description",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (result.error) {
    return {
      response: handleApiError(
        result.error,
        "POST /api/community/events/ops (event lookup)",
      ),
    };
  }
  if (!result.data) {
    return { response: NextResponse.json({ error: "Event not found" }, { status: 404 }) };
  }
  return result.data as CommunityEventRow;
}

function authorizeCommunityEventOps(
  event: CommunityEventRow,
  userId: string | null,
  adminAccess: Awaited<ReturnType<typeof requireAdminAccess>>,
  reason: string,
):
  | { isOrganizer: boolean; isAdminOverride: boolean; operationId: string | null; auditDetails: Record<string, unknown> | null }
  | { response: NextResponse } {
  const isOrganizer = event.organizer_clerk_id === userId;
  if (!isOrganizer && !adminAccess.ok) {
    return { response: adminAccessErrorJsonResponse(adminAccess) };
  }
  const isAdminOverride = !isOrganizer && adminAccess.ok;
  if (isAdminOverride && reason.length < 5) {
    return {
      response: NextResponse.json(
        { error: "A reason of at least 5 characters is required for an admin override" },
        { status: 400 },
      ),
    };
  }
  const operationId = isAdminOverride ? `community-event-ops-${randomUUID()}` : null;
  return {
    isOrganizer,
    isAdminOverride,
    operationId,
    auditDetails: isAdminOverride
      ? {
          operation: ADMIN_OVERRIDE_OPERATION,
          targetUserId: event.organizer_clerk_id,
          reason,
        }
      : null,
  };
}

function buildCommunityEventUpdate(
  event: CommunityEventRow,
  payload: UpdateEventOpsPayload,
) {
  const parsedDescription = parseCommunityEventDescription(event.description);
  const mergedOps = mergeCommunityEventOps(parsedDescription.ops, {
    capacityTarget: payload.capacityTarget,
    attendanceCount: payload.attendanceCount,
    postMortem: payload.postMortem,
  });
  return {
    parsedDescription,
    mergedOps,
    description: serializeCommunityEventDescription(parsedDescription.plainDescription, mergedOps),
    location: payload.location === undefined
      ? {}
      : payload.location === null
        ? communityEventLocationToDatabase(null)
        : communityEventLocationToDatabase(payload.location),
  };
}

async function auditCommunityEventOverride({
  operationId,
  adminAccess,
  eventId,
  auditDetails,
  outcome,
  stage,
  values,
}: {
  operationId: string;
  adminAccess: Extract<Awaited<ReturnType<typeof requireAdminAccess>>, { ok: true }>;
  eventId: string;
  auditDetails: Record<string, unknown>;
  outcome: "success" | "error";
  stage?: string;
  values?: { previousValue: CommunityEventOpsAuditValue; newValue: CommunityEventOpsAuditValue };
}) {
  await appendAdminOperationAudit({
    operationId,
    at: new Date().toISOString(),
    actorUserId: adminAccess.userId,
    operationType: "admin_operation",
    outcome,
    targetId: eventId,
    details: {
      ...auditDetails,
      ...(stage ? { stage } : {}),
      ...(values ?? {}),
    },
  });
}

async function persistCommunityEventUpdate({
  supabase,
  eventId,
  update,
  adminAccess,
  operationId,
  auditDetails,
}: {
  supabase: CommunityEventSupabase;
  eventId: string;
  update: ReturnType<typeof buildCommunityEventUpdate>;
  adminAccess: Awaited<ReturnType<typeof requireAdminAccess>>;
  operationId: string | null;
  auditDetails: Record<string, unknown> | null;
}): Promise<CommunityEventRow | { response: NextResponse }> {
  try {
    const updated = await supabase
      .from("community_events")
      .update({ description: update.description, ...update.location })
      .eq("id", eventId)
      .select(
        "id, created_at, organizer_clerk_id, title, event_date, location_label, latitude, longitude, location_source, description",
      )
      .single();
    if (updated.error) {
      if (operationId && auditDetails && adminAccess.ok) {
        await auditCommunityEventOverride({
          operationId,
          adminAccess,
          eventId,
          auditDetails,
          outcome: "error",
          stage: "event_update",
        });
      }
      return { response: handleApiError(updated.error, "POST /api/community/events/ops (update)") };
    }
    return updated.data as CommunityEventRow;
  } catch (error) {
    if (operationId && auditDetails && adminAccess.ok) {
      await auditCommunityEventOverride({
        operationId,
        adminAccess,
        eventId,
        auditDetails,
        outcome: "error",
        stage: "event_update",
      });
    }
    return { response: handleApiError(error, "POST /api/community/events/ops (update)") };
  }
}

async function trackCommunityEventOps(
  supabase: CommunityEventSupabase,
  userId: string | null,
  eventId: string,
 item: CommunityEventItem,
) {
  if (!userId) return;
  try {
    await trackCommunityOpsUpdate(supabase, {
      userId,
      eventId,
      attendanceCount: item.attendanceCount,
      hasPostMortem: (item.postMortem ?? "").trim().length >= 20,
    });
  } catch (progressionError) {
    console.error("Progression tracking failed for community ops update", {
      userId,
      eventId,
      message: progressionError instanceof Error ? progressionError.message : String(progressionError),
    });
  }
}

function toCommunityEventOpsAuditValue(
 ops: ReturnType<typeof defaultCommunityEventOps>,
): CommunityEventOpsAuditValue {
 const postMortem = (ops.postMortem ?? "").trim();
 return {
 capacityTarget: ops.capacityTarget,
 attendanceCount: ops.attendanceCount,
 postMortemPresent: postMortem.length > 0,
 postMortemLength: postMortem.length,
 };
}

export async function POST(request: Request) {
 const adminAccess = await requireAdminAccess();
 const { userId } = await auth();

 let payload: unknown;
 try {
 payload = await request.json();
 } catch {
 return NextResponse.json(
 { error:"Invalid JSON payload" },
 { status: 400 },
 );
 }

  const parsed = parseUpdateEventOpsPayload(payload);
  if ("response" in parsed) return parsed.response;

 const supabase = getSupabaseServerClient(true);
  const event = await loadCommunityEvent(supabase, parsed.data.eventId);
  if ("response" in event) return event.response;

  const permission = authorizeCommunityEventOps(
    event,
    userId,
    adminAccess,
    parsed.data.reason?.trim() ?? "",
  );
  if ("response" in permission) return permission.response;

  const update = buildCommunityEventUpdate(event, parsed.data);
  const previousValue = toCommunityEventOpsAuditValue(update.parsedDescription.ops);
  const newValue = toCommunityEventOpsAuditValue(update.mergedOps);
  const auditDetails = permission.auditDetails
    ? { ...permission.auditDetails, previousValue, newValue }
    : null;
  const updated = await persistCommunityEventUpdate({
    supabase,
    eventId: parsed.data.eventId,
    update,
    adminAccess,
    operationId: permission.operationId,
    auditDetails,
  });
  if ("response" in updated) return updated.response;

 revalidateCommunityEventCaches();

  if (permission.operationId && auditDetails && adminAccess.ok) {
    await auditCommunityEventOverride({
      operationId: permission.operationId,
      adminAccess,
      eventId: parsed.data.eventId,
      auditDetails,
      outcome: "success",
    });
 }

 const summaries = await loadCommunityEventRsvpSummaries(supabase, {
  eventIds: [parsed.data.eventId],
  userId: userId ?? null,
 });

 const item = toCommunityEventItem(
  updated,
  summaries[0] ?? null,
  { canEditOwnOps: permission.isOrganizer },
 );

  await trackCommunityEventOps(supabase, userId, parsed.data.eventId, item);

 return NextResponse.json({ status:"ok", item });
}
