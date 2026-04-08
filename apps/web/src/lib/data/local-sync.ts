import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocalDataRecord, LocalRecordSource, LocalRecordStatus, LocalRecordType } from "@/lib/data/local-records";
import { LOCAL_DB_FILES, upsertLocalRecords } from "@/lib/data/local-store";
import { mapActionStatusToLocalStatus } from "@/lib/data/local-records";

type ActionRow = {
  id: string;
  created_at: string;
  action_date: string;
  actor_name: string | null;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  waste_kg: number | null;
  cigarette_butts: number | null;
  volunteers_count: number | null;
  duration_minutes: number | null;
  notes: string | null;
  status: string;
};

type LegacySubmissionRow = {
  id: string;
  created_at: string | null;
  nom: string | null;
  adresse: string;
  date: string | null;
  lat: number | null;
  lon: number | null;
  dechets_kg: number | null;
  megots: number | null;
  benevoles: number | null;
  temps_min: number | null;
  commentaire: string | null;
  status: string | null;
  est_propre: boolean | null;
};

type SpotRow = {
  id: string;
  created_at: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  status: string;
};

function toDisplayableMap(latitude: number | null, longitude: number | null) {
  const valid = typeof latitude === "number" && typeof longitude === "number";
  return {
    displayable: valid,
    lat: valid ? latitude : null,
    lon: valid ? longitude : null,
  };
}

function toLocalRecordStatusFromSpotStatus(status: string): LocalRecordStatus {
  if (status === "validated" || status === "cleaned") {
    return "validated";
  }
  return "pending";
}

function fromActionRow(row: ActionRow, source: LocalRecordSource, validatedBy: string): LocalDataRecord {
  const localStatus = mapActionStatusToLocalStatus(row.status);
  return {
    id: `validated-action-${row.id}`,
    recordType: "action",
    status: localStatus,
    source,
    title: row.location_label,
    description: row.notes,
    location: {
      label: row.location_label,
      city: "Paris",
      latitude: row.latitude,
      longitude: row.longitude,
    },
    eventDate: row.action_date,
    metrics: {
      wasteKg: row.waste_kg ?? 0,
      cigaretteButts: row.cigarette_butts ?? 0,
      volunteersCount: row.volunteers_count ?? 0,
      durationMinutes: row.duration_minutes ?? 0,
    },
    map: toDisplayableMap(row.latitude, row.longitude),
    trace: {
      externalId: row.id,
      originTable: "actions",
      validatedBy,
      validatedAt: new Date().toISOString(),
      notes: row.actor_name ? `Declared by ${row.actor_name}` : null,
    },
  };
}

function fromLegacySubmissionRow(row: LegacySubmissionRow, source: LocalRecordSource, validatedBy: string): LocalDataRecord {
  const recordType: LocalRecordType = row.est_propre ? "clean_place" : "action";
  const localStatus = mapActionStatusToLocalStatus(row.status ?? "pending");
  return {
    id: `validated-submission-${row.id}`,
    recordType,
    status: localStatus,
    source,
    title: row.adresse,
    description: row.commentaire,
    location: {
      label: row.adresse,
      city: "Paris",
      latitude: row.lat,
      longitude: row.lon,
    },
    eventDate: row.date,
    metrics: row.est_propre
      ? undefined
      : {
          wasteKg: row.dechets_kg ?? 0,
          cigaretteButts: row.megots ?? 0,
          volunteersCount: row.benevoles ?? 0,
          durationMinutes: row.temps_min ?? 0,
        },
    map: toDisplayableMap(row.lat, row.lon),
    trace: {
      externalId: row.id,
      originTable: "submissions",
      validatedBy,
      validatedAt: new Date().toISOString(),
      notes: row.nom ? `Declared by ${row.nom}` : null,
    },
  };
}

function fromSpotRow(row: SpotRow, source: LocalRecordSource, validatedBy: string): LocalDataRecord {
  return {
    id: `validated-spot-${row.id}`,
    recordType: "clean_place",
    status: toLocalRecordStatusFromSpotStatus(row.status),
    source,
    title: row.label,
    description: row.notes,
    location: {
      label: row.label,
      city: "Paris",
      latitude: row.latitude,
      longitude: row.longitude,
    },
    map: toDisplayableMap(row.latitude, row.longitude),
    trace: {
      externalId: row.id,
      originTable: "spots",
      validatedBy,
      validatedAt: new Date().toISOString(),
      notes: null,
    },
  };
}

export async function copyValidatedActionToLocalStore(
  supabase: SupabaseClient,
  actionId: string,
  validatedBy: string,
): Promise<{ source: "actions" | "submissions"; copied: boolean }> {
  const primary = await supabase
    .from("actions")
    .select(
      "id, created_at, action_date, actor_name, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, status",
    )
    .eq("id", actionId)
    .maybeSingle();

  if (!primary.error && primary.data) {
    await upsertLocalRecords(LOCAL_DB_FILES.validated, [fromActionRow(primary.data as ActionRow, "admin_validation", validatedBy)]);
    return { source: "actions", copied: true };
  }

  const legacy = await supabase
    .from("submissions")
    .select(
      "id, created_at, nom, adresse, date, lat, lon, dechets_kg, megots, benevoles, temps_min, commentaire, status, est_propre",
    )
    .eq("id", actionId)
    .maybeSingle();

  if (legacy.error || !legacy.data) {
    return { source: "submissions", copied: false };
  }

  await upsertLocalRecords(LOCAL_DB_FILES.validated, [
    fromLegacySubmissionRow(legacy.data as LegacySubmissionRow, "admin_validation", validatedBy),
  ]);
  return { source: "submissions", copied: true };
}

export async function copyValidatedSpotToLocalStore(
  supabase: SupabaseClient,
  spotId: string,
  validatedBy: string,
): Promise<boolean> {
  const row = await supabase.from("spots").select("id, created_at, label, latitude, longitude, notes, status").eq("id", spotId).maybeSingle();
  if (row.error || !row.data) {
    return false;
  }
  await upsertLocalRecords(LOCAL_DB_FILES.validated, [fromSpotRow(row.data as SpotRow, "admin_validation", validatedBy)]);
  return true;
}
