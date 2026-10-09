import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getOrganizerDirectoryEntries,
  ORGANIZER_DIRECTORY,
} from "./association-options";
import { type OrganizerType, SPONTANEOUS_PENDING_ORGANIZER_LABEL } from "./organizer-type";
import type { CreateActionPayload } from "./types";

export type OrganizerDirectorySuggestion = {
  id: string;
  name: string;
  organizerType: Exclude<OrganizerType, "spontaneous">;
  source: "canonical" | "user_created";
  locationLabel?: string | null;
};

type PersistedOrganizerRow = {
  id: string;
  name: string;
  normalized_name: string;
  organizer_type: Exclude<OrganizerType, "spontaneous">;
};

export function normalizeOrganizerName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isCatalogOrganizerType(
  value: OrganizerType | "" | null | undefined,
): value is Exclude<OrganizerType, "spontaneous"> {
  return Boolean(value && value !== "spontaneous");
}

function staticSuggestion(
  entry: (typeof ORGANIZER_DIRECTORY)[number],
): OrganizerDirectorySuggestion {
  const locationLabel = [entry.city, entry.region]
    .filter((part) => Boolean(part?.trim()))
    .join(" · ");
  return {
    id: entry.id,
    name: entry.name,
    organizerType: entry.organizerType,
    source: "canonical",
    locationLabel: locationLabel || null,
  };
}

function matchesQuery(name: string, query: string): boolean {
  const normalizedQuery = normalizeOrganizerName(query);
  return !normalizedQuery || normalizeOrganizerName(name).includes(normalizedQuery);
}

function resolvedOrganizer(row: PersistedOrganizerRow) {
  return { organizerId: row.id, organizerName: row.name, legacyAssociationName: row.name };
}

async function loadNamedOrganizer(
  supabase: SupabaseClient,
  organizerType: Exclude<OrganizerType, "spontaneous">,
  normalizedName: string,
) {
  const existing = await supabase
    .from("organizer_directory_entries")
    .select("id, name, normalized_name, organizer_type")
    .eq("organizer_type", organizerType)
    .eq("normalized_name", normalizedName)
    .maybeSingle();
  if (existing.error) throw existing.error;
  return existing.data ? resolvedOrganizer(existing.data as PersistedOrganizerRow) : null;
}

export function getStaticOrganizerSuggestions(
  organizerType: OrganizerType | "" | null | undefined,
  query = "",
): OrganizerDirectorySuggestion[] {
  if (!isCatalogOrganizerType(organizerType)) return [];
  return getOrganizerDirectoryEntries(organizerType)
    .filter((entry) => matchesQuery(entry.name, query))
    .slice(0, 20)
    .map(staticSuggestion);
}

function getStaticOrganizerById(id: string | null | undefined) {
  if (!id?.trim()) return null;
  return ORGANIZER_DIRECTORY.find((entry) => entry.id === id.trim()) ?? null;
}

function getStaticOrganizerByNormalizedName(name: string) {
  const normalizedName = normalizeOrganizerName(name);
  if (!normalizedName) return null;
  return ORGANIZER_DIRECTORY.find(
    (entry) =>
      normalizeOrganizerName(entry.name) === normalizedName ||
      normalizeOrganizerName(entry.value) === normalizedName,
  ) ?? null;
}

export async function searchOrganizerDirectory(params: {
  supabase: SupabaseClient;
  organizerType: OrganizerType;
  query?: string;
}): Promise<OrganizerDirectorySuggestion[]> {
  const { supabase, organizerType, query = "" } = params;
  if (!isCatalogOrganizerType(organizerType)) return [];

  const staticEntries = getStaticOrganizerSuggestions(organizerType, query);
  const { data, error } = await supabase
    .from("organizer_directory_entries")
    .select("id, name, normalized_name, organizer_type")
    .eq("organizer_type", organizerType)
    .order("name", { ascending: true })
    .limit(50);

  if (error) throw error;
  const persisted = ((data ?? []) as PersistedOrganizerRow[])
    .filter((entry) => matchesQuery(entry.name, query))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      organizerType: entry.organizer_type,
      source: "user_created" as const,
      locationLabel: null,
    }));

  const seen = new Set<string>();
  return [...staticEntries, ...persisted].filter((entry) => {
    const key = `${entry.organizerType}:${normalizeOrganizerName(entry.name)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

export async function resolveActionOrganizer(params: {
  supabase: SupabaseClient;
  organizerType: OrganizerType;
  organizerId?: string | null;
  organizerName?: string | null;
  actorName?: string | null;
}): Promise<{ organizerId: string | null; organizerName: string; legacyAssociationName: string }> {
  const enteredName = (params.organizerName ?? "").trim();
  if (params.organizerType === "spontaneous") {
    void params.actorName;
    if (params.organizerId?.trim()) {
      throw new Error("Validation: une action spontanée ne peut pas référencer une structure.");
    }
    const name = enteredName === SPONTANEOUS_PENDING_ORGANIZER_LABEL
      ? SPONTANEOUS_PENDING_ORGANIZER_LABEL
      : enteredName;
    return { organizerId: null, organizerName: name, legacyAssociationName: "Action spontanée" };
  }
  const selectedId = params.organizerId?.trim();
  const staticEntry = getStaticOrganizerById(selectedId);
  if (staticEntry) {
    if (staticEntry.organizerType !== params.organizerType) {
      throw new Error("L'organisateur sélectionné ne correspond pas au type choisi.");
    }
    return { organizerId: staticEntry.id, organizerName: staticEntry.name, legacyAssociationName: staticEntry.name };
  }
  if (selectedId) return resolveSelectedOrganizer(params.supabase, selectedId, params.organizerType);
  if (!enteredName) throw new Error("Renseignez un organisateur pour le type choisi.");
  return resolveNamedOrganizer(params.supabase, params.organizerType, enteredName);
}

async function resolveSelectedOrganizer(
  supabase: SupabaseClient,
  selectedId: string,
  organizerType: Exclude<OrganizerType, "spontaneous">,
) {
  const { data, error } = await supabase
    .from("organizer_directory_entries")
    .select("id, name, normalized_name, organizer_type")
    .eq("id", selectedId)
    .eq("organizer_type", organizerType)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("L'organisateur sélectionné est introuvable.");
  const row = data as PersistedOrganizerRow;
  return { organizerId: row.id, organizerName: row.name, legacyAssociationName: row.name };
}

async function resolveNamedOrganizer(
  supabase: SupabaseClient,
  organizerType: Exclude<OrganizerType, "spontaneous">,
  enteredName: string,
) {
  const existing = await findExistingNamedOrganizer(supabase, organizerType, enteredName);
  if (existing) return existing;

  throw new Error("Validation: sélectionnez une structure existante dans la liste.");
}

async function findExistingNamedOrganizer(
  supabase: SupabaseClient,
  organizerType: Exclude<OrganizerType, "spontaneous">,
  enteredName: string,
) {
  const normalizedName = normalizeOrganizerName(enteredName);
  if (!normalizedName) {
    throw new Error("Validation: le nom de l'organisateur doit contenir des caractères lisibles.");
  }

  const normalizedStaticMatch = getStaticOrganizerByNormalizedName(enteredName);
  if (normalizedStaticMatch) {
    if (normalizedStaticMatch.organizerType !== organizerType) {
      throw new Error("L'organisateur saisi ne correspond pas au type choisi.");
    }
    return {
      organizerId: normalizedStaticMatch.id,
      organizerName: normalizedStaticMatch.name,
      legacyAssociationName: normalizedStaticMatch.name,
    };
  }

  const existing = await loadNamedOrganizer(supabase, organizerType, normalizedName);
  return existing;
}

export async function createActionOrganizer(params: {
  supabase: SupabaseClient;
  organizerType: Exclude<OrganizerType, "spontaneous">;
  organizerName: string;
  createdByClerkId: string;
}): Promise<{ organizerId: string; organizerName: string; legacyAssociationName: string }> {
  const enteredName = params.organizerName.trim();
  const normalizedName = normalizeOrganizerName(enteredName);
  if (!normalizedName) {
    throw new Error("Validation: le nom de l'organisateur doit contenir des caractères lisibles.");
  }

  const existing = await findExistingNamedOrganizer(
    params.supabase,
    params.organizerType,
    enteredName,
  );
  if (existing) return existing;

  const created = await params.supabase
    .from("organizer_directory_entries")
    .insert({
      id: crypto.randomUUID(),
      name: enteredName,
      normalized_name: normalizedName,
      organizer_type: params.organizerType,
      created_by_clerk_id: params.createdByClerkId,
    })
    .select("id, name, normalized_name, organizer_type")
    .single();
  if (created.error) {
    if (created.error.code === "23505") {
      const raced = await loadNamedOrganizer(params.supabase, params.organizerType, normalizedName);
      if (raced) return raced;
    }
    throw created.error;
  }
  const row = created.data as PersistedOrganizerRow;
  return resolvedOrganizer(row);
}

export async function resolveCanonicalCreateActionPayload(params: {
  supabase: SupabaseClient;
  payload: CreateActionPayload;
}): Promise<CreateActionPayload> {
  if (!params.payload.organizerType) return params.payload;
  const resolved = await resolveActionOrganizer({
    supabase: params.supabase,
    organizerType: params.payload.organizerType,
    organizerId: params.payload.organizerId,
    organizerName:
      params.payload.organizerName ??
      (params.payload.organizerType === "spontaneous"
        ? undefined
        : params.payload.associationName),
    actorName: params.payload.actorName,
  });
  return {
    ...params.payload,
    organizerId: resolved.organizerId,
    organizerName: resolved.organizerName,
    associationName: resolved.legacyAssociationName,
  };
}
