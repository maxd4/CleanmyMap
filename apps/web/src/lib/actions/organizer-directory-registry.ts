import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getOrganizerDirectoryEntryByValue,
  getOrganizerDirectoryEntries,
  ORGANIZER_DIRECTORY,
} from "./association-options";
import type { OrganizerType } from "./organizer-type";
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
  createdByClerkId: string;
}): Promise<{ organizerId: string | null; organizerName: string; legacyAssociationName: string }> {
  const enteredName = (params.organizerName ?? "").trim();
  if (params.organizerType === "spontaneous") {
    const name = enteredName || params.actorName?.trim() || "Action spontanée";
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
  return resolveNamedOrganizer(params.supabase, params.organizerType, enteredName, params.createdByClerkId);
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
  createdByClerkId: string,
) {
  const staticMatch = getOrganizerDirectoryEntryByValue(enteredName);
  if (staticMatch) {
    if (staticMatch.organizerType !== organizerType) {
      throw new Error("L'organisateur saisi ne correspond pas au type choisi.");
    }
    return { organizerId: staticMatch.id, organizerName: staticMatch.name, legacyAssociationName: staticMatch.name };
  }
  const normalizedName = normalizeOrganizerName(enteredName);
  const existing = await supabase
    .from("organizer_directory_entries")
    .select("id, name, normalized_name, organizer_type")
    .eq("organizer_type", organizerType)
    .eq("normalized_name", normalizedName)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const row = existing.data as PersistedOrganizerRow;
    return { organizerId: row.id, organizerName: row.name, legacyAssociationName: row.name };
  }
  const created = await supabase
    .from("organizer_directory_entries")
    .insert({
      id: crypto.randomUUID(),
      name: enteredName,
      normalized_name: normalizedName,
      organizer_type: organizerType,
      created_by_clerk_id: createdByClerkId,
    })
    .select("id, name, normalized_name, organizer_type")
    .single();
  if (created.error) throw created.error;
  const row = created.data as PersistedOrganizerRow;
  return { organizerId: row.id, organizerName: row.name, legacyAssociationName: row.name };
}

export async function resolveCanonicalCreateActionPayload(params: {
  supabase: SupabaseClient;
  payload: CreateActionPayload;
  createdByClerkId: string;
}): Promise<CreateActionPayload> {
  if (!params.payload.organizerType) return params.payload;
  const resolved = await resolveActionOrganizer({
    supabase: params.supabase,
    organizerType: params.payload.organizerType,
    organizerId: params.payload.organizerId,
    organizerName: params.payload.organizerName ?? params.payload.associationName,
    actorName: params.payload.actorName,
    createdByClerkId: params.createdByClerkId,
  });
  return {
    ...params.payload,
    organizerId: resolved.organizerId,
    organizerName: resolved.organizerName,
    associationName: resolved.legacyAssociationName,
  };
}
