import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { copyValidatedActionToLocalStore, copyValidatedSpotToLocalStore } from "@/lib/data/local-sync";

export const runtime = "nodejs";

const actionPayloadSchema = z.object({
  entityType: z.literal("action"),
  id: z.string().trim().min(1),
  status: z.enum(["pending", "approved", "rejected"]),
});

const cleanPlacePayloadSchema = z.object({
  entityType: z.literal("clean_place"),
  id: z.string().trim().min(1),
  status: z.enum(["new", "validated", "cleaned"]),
});

const moderationPayloadSchema = z.union([actionPayloadSchema, cleanPlacePayloadSchema]);

function isMissingActionsTableError(errorMessage: string): boolean {
  const message = errorMessage.toLowerCase();
  return message.includes("could not find the table") && message.includes("actions");
}

async function updateActionStatus(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  id: string,
  status: "pending" | "approved" | "rejected",
): Promise<{ source: "actions" | "submissions"; found: boolean }> {
  const primary = await supabase.from("actions").update({ status }).eq("id", id).select("id").maybeSingle();

  if (!primary.error && primary.data) {
    return { source: "actions", found: true };
  }
  if (primary.error && !isMissingActionsTableError(primary.error.message)) {
    throw new Error(primary.error.message);
  }

  const legacy = await supabase.from("submissions").update({ status }).eq("id", id).select("id").maybeSingle();
  if (legacy.error) {
    throw new Error(legacy.error.message);
  }
  return { source: "submissions", found: Boolean(legacy.data) };
}

async function updateSpotStatus(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  id: string,
  status: "new" | "validated" | "cleaned",
): Promise<boolean> {
  const updated = await supabase.from("spots").update({ status }).eq("id", id).select("id").maybeSingle();
  if (updated.error) {
    throw new Error(updated.error.message);
  }
  return Boolean(updated.data);
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = moderationPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();

  try {
    if (parsed.data.entityType === "action") {
      const statusUpdate = await updateActionStatus(supabase, parsed.data.id, parsed.data.status);
      if (!statusUpdate.found) {
        return NextResponse.json({ error: "Action not found" }, { status: 404 });
      }

      let copied = false;
      if (parsed.data.status === "approved") {
        const syncResult = await copyValidatedActionToLocalStore(supabase, parsed.data.id, access.userId);
        copied = syncResult.copied;
      }

      return NextResponse.json({
        status: "ok",
        entityType: "action",
        id: parsed.data.id,
        sourceTable: statusUpdate.source,
        copiedToLocalValidatedStore: copied,
      });
    }

    const updated = await updateSpotStatus(supabase, parsed.data.id, parsed.data.status);
    if (!updated) {
      return NextResponse.json({ error: "Clean place not found" }, { status: 404 });
    }

    let copied = false;
    if (parsed.data.status === "validated" || parsed.data.status === "cleaned") {
      copied = await copyValidatedSpotToLocalStore(supabase, parsed.data.id, access.userId);
    }

    return NextResponse.json({
      status: "ok",
      entityType: "clean_place",
      id: parsed.data.id,
      sourceTable: "spots",
      copiedToLocalValidatedStore: copied,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
