import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminCleanPlaceEdits } from "@/lib/admin/moderation/action-moderation-edits";

export const SIGNALEMENT_MODERATION_SOURCES = [
  "trash_spotter_spots",
] as const;

export type SignalementModerationSource =
  (typeof SIGNALEMENT_MODERATION_SOURCES)[number];
export type SignalementModerationStatus = "new" | "validated" | "cleaned";

export type ModeratableSignalement = {
  id: string;
  created_at: string;
  created_by_clerk_id: string | null;
  label: string;
  latitude: number | null;
  longitude: number | null;
  status: SignalementModerationStatus;
  notes: string | null;
  sourceTable: "trash_spotter_spots";
  spot_type: string | null;
  validated_at: string | null;
  cleaned_at: string | null;
};

export type SignalementModerationResult = {
  found: boolean;
  sourceTable: SignalementModerationSource | null;
  signalement: ModeratableSignalement | null;
};

type ModerationListParams = {
  status?: SignalementModerationStatus;
  limit?: number;
};

const CANONICAL_SELECT =
  "id, created_at, created_by_clerk_id, label, spot_type, latitude, longitude, status, notes, validated_at, cleaned_at";

function isModerationStatus(value: unknown): value is SignalementModerationStatus {
  return value === "new" || value === "validated" || value === "cleaned";
}

function toCanonicalSignalement(row: Record<string, unknown>): ModeratableSignalement {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    created_by_clerk_id:
      typeof row.created_by_clerk_id === "string"
        ? row.created_by_clerk_id
        : null,
    label: String(row.label),
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null,
    status: isModerationStatus(row.status) ? row.status : "new",
    notes: typeof row.notes === "string" ? row.notes : null,
    sourceTable: "trash_spotter_spots",
    spot_type: typeof row.spot_type === "string" ? row.spot_type : null,
    validated_at: typeof row.validated_at === "string" ? row.validated_at : null,
    cleaned_at: typeof row.cleaned_at === "string" ? row.cleaned_at : null,
  };
}

export async function readSignalementForModeration(
  supabase: SupabaseClient,
  id: string,
): Promise<ModeratableSignalement | null> {
  const result = await supabase
    .from("trash_spotter_spots")
    .select(CANONICAL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (result.error) {
    throw new Error("Signalement trash_spotter_spots read failed");
  }
  if (!result.data) {
    return null;
  }
  return toCanonicalSignalement(
    result.data as unknown as Record<string, unknown>,
  );
}

export async function listModeratableSignalements(
  supabase: SupabaseClient,
  params: ModerationListParams = {},
): Promise<{ items: ModeratableSignalement[]; count: number }> {
  const status = params.status ?? "new";
  const limit = Math.max(1, Math.min(params.limit ?? 6, 100));

  const result = await supabase
    .from("trash_spotter_spots")
    .select(CANONICAL_SELECT, { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (result.error) {
    throw new Error("Signalement moderation queue read failed");
  }

  const items = ((result.data ?? []) as Record<string, unknown>[])
    .map(toCanonicalSignalement)
    .sort((left, right) => {
      const createdAtOrder = right.created_at.localeCompare(left.created_at);
      if (createdAtOrder !== 0) {
        return createdAtOrder;
      }
      return left.id.localeCompare(right.id);
    });

  return {
    items,
    count: Number(result.count ?? 0),
  };
}

function buildCanonicalUpdates(
  current: ModeratableSignalement,
  status: SignalementModerationStatus,
  edits?: AdminCleanPlaceEdits,
): Record<string, unknown> {
  const now = new Date().toISOString();
  const validatedAt =
    status === "new" ? null : current.validated_at ?? now;
  const cleanedAt =
    status === "cleaned" ? current.cleaned_at ?? now : null;

  return {
    status,
    validated_at: validatedAt,
    cleaned_at: cleanedAt,
    ...(edits?.label !== undefined ? { label: edits.label } : {}),
    ...(edits?.spotType !== undefined ? { spot_type: edits.spotType } : {}),
    ...(edits?.latitude !== undefined ? { latitude: edits.latitude } : {}),
    ...(edits?.longitude !== undefined ? { longitude: edits.longitude } : {}),
    ...(edits?.notes !== undefined ? { notes: edits.notes } : {}),
  };
}

export async function moderateSignalement(
  supabase: SupabaseClient,
  params: {
    id: string;
    status: SignalementModerationStatus;
    edits?: AdminCleanPlaceEdits;
  },
): Promise<SignalementModerationResult> {
  const current = await readSignalementForModeration(supabase, params.id);
  if (!current) {
    return { found: false, sourceTable: null, signalement: null };
  }

  const updated = await supabase
    .from("trash_spotter_spots")
    .update(buildCanonicalUpdates(current, params.status, params.edits))
    .eq("id", params.id)
    .select(CANONICAL_SELECT)
    .maybeSingle();

  if (updated.error) {
    throw new Error("Signalement trash_spotter_spots update failed");
  }
  if (!updated.data) {
    return {
      found: false,
      sourceTable: "trash_spotter_spots",
      signalement: null,
    };
  }

  return {
    found: true,
    sourceTable: "trash_spotter_spots",
    signalement: toCanonicalSignalement(
      updated.data as unknown as Record<string, unknown>,
    ),
  };
}
