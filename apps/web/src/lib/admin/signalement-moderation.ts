import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAdminCleanPlaceUpdates,
  type AdminCleanPlaceEdits,
} from "@/lib/admin/action-moderation-edits";

export const SIGNALEMENT_MODERATION_SOURCES = [
  "trash_spotter_spots",
  "spots",
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
  sourceTable: SignalementModerationSource;
  spot_type: string | null;
  waste_type: string | null;
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
const LEGACY_SELECT =
  "id, created_at, created_by_clerk_id, label, waste_type, latitude, longitude, status, notes";

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
    waste_type: null,
    validated_at: typeof row.validated_at === "string" ? row.validated_at : null,
    cleaned_at: typeof row.cleaned_at === "string" ? row.cleaned_at : null,
  };
}

function toLegacySignalement(row: Record<string, unknown>): ModeratableSignalement {
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
    sourceTable: "spots",
    spot_type: null,
    waste_type: typeof row.waste_type === "string" ? row.waste_type : null,
    validated_at: null,
    cleaned_at: null,
  };
}

async function readFromSource(
  supabase: SupabaseClient,
  id: string,
  sourceTable: SignalementModerationSource,
): Promise<ModeratableSignalement | null> {
  const result = await supabase
    .from(sourceTable)
    .select(sourceTable === "trash_spotter_spots" ? CANONICAL_SELECT : LEGACY_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (result.error) {
    throw new Error(`Signalement ${sourceTable} read failed`);
  }
  if (!result.data) {
    return null;
  }
  return sourceTable === "trash_spotter_spots"
    ? toCanonicalSignalement(
        result.data as unknown as Record<string, unknown>,
      )
    : toLegacySignalement(result.data as unknown as Record<string, unknown>);
}

export async function readSignalementForModeration(
  supabase: SupabaseClient,
  id: string,
  preferredSource?: SignalementModerationSource,
): Promise<ModeratableSignalement | null> {
  if (preferredSource) {
    return readFromSource(supabase, id, preferredSource);
  }

  const canonical = await readFromSource(supabase, id, "trash_spotter_spots");
  return canonical ?? readFromSource(supabase, id, "spots");
}

export async function listModeratableSignalements(
  supabase: SupabaseClient,
  params: ModerationListParams = {},
): Promise<{ items: ModeratableSignalement[]; count: number }> {
  const status = params.status ?? "new";
  const limit = Math.max(1, Math.min(params.limit ?? 6, 100));

  const [canonicalResult, legacyResult] = await Promise.all([
    supabase
      .from("trash_spotter_spots")
      .select(CANONICAL_SELECT, { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("spots")
      .select(LEGACY_SELECT, { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (canonicalResult.error || legacyResult.error) {
    throw new Error("Signalement moderation queue read failed");
  }

  const items = [
    ...((canonicalResult.data ?? []) as Record<string, unknown>[]).map(
      toCanonicalSignalement,
    ),
    ...((legacyResult.data ?? []) as Record<string, unknown>[]).map(
      toLegacySignalement,
    ),
  ]
    .sort((left, right) => {
      const createdAtOrder = right.created_at.localeCompare(left.created_at);
      if (createdAtOrder !== 0) {
        return createdAtOrder;
      }
      if (left.sourceTable !== right.sourceTable) {
        return left.sourceTable === "trash_spotter_spots" ? -1 : 1;
      }
      return left.id.localeCompare(right.id);
    })
    .slice(0, limit);

  return {
    items,
    count: Number(canonicalResult.count ?? 0) + Number(legacyResult.count ?? 0),
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
    preferredSource?: SignalementModerationSource;
  },
): Promise<SignalementModerationResult> {
  const current = await readSignalementForModeration(
    supabase,
    params.id,
    params.preferredSource,
  );
  if (!current) {
    return { found: false, sourceTable: null, signalement: null };
  }

  const updates =
    current.sourceTable === "trash_spotter_spots"
      ? buildCanonicalUpdates(current, params.status, params.edits)
      : buildAdminCleanPlaceUpdates(params.status, params.edits);
  const updated = await supabase
    .from(current.sourceTable)
    .update(updates)
    .eq("id", params.id)
    .select(
      current.sourceTable === "trash_spotter_spots"
        ? CANONICAL_SELECT
        : LEGACY_SELECT,
    )
    .maybeSingle();

  if (updated.error) {
    throw new Error(`Signalement ${current.sourceTable} update failed`);
  }
  if (!updated.data) {
    return { found: false, sourceTable: current.sourceTable, signalement: null };
  }

  return {
    found: true,
    sourceTable: current.sourceTable,
    signalement:
      current.sourceTable === "trash_spotter_spots"
        ? toCanonicalSignalement(
            updated.data as unknown as Record<string, unknown>,
          )
        : toLegacySignalement(
            updated.data as unknown as Record<string, unknown>,
          ),
  };
}
