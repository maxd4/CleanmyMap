import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildSpogomiGalleryPhotoInput,
  parseSpogomiGalleryEntry,
  resolvePublicSpogomiGallery,
  type SpogomiGalleryEntry,
  type SpogomiPublicGalleryPhoto,
} from "./photo-gallery";

type ActionGalleryRow = {
  id: string;
  status: string | null;
  published_at: string | null;
  moderation_visibility: string | null;
  preparation_data: Record<string, unknown> | null;
};

function isPublicAction(row: Pick<ActionGalleryRow, "status" | "published_at" | "moderation_visibility">): boolean {
  return row.status === "approved" && Boolean(row.published_at) && row.moderation_visibility !== "hidden";
}
function storedGallery(value: unknown): SpogomiGalleryEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map(parseSpogomiGalleryEntry)
    .filter((photo): photo is SpogomiGalleryEntry => Boolean(photo))
    .filter((photo) => !seen.has(photo.id) && seen.add(photo.id));
}

async function loadActionGalleryRow(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionGalleryRow | null> {
  const result = await supabase
    .from("actions")
    .select("id, status, published_at, moderation_visibility, preparation_data")
    .eq("id", actionId)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data as ActionGalleryRow | null;
}

export async function loadSpogomiGalleryEntries(params: {
  supabase: SupabaseClient;
  actionId: string;
  publicOnly?: boolean;
}): Promise<SpogomiGalleryEntry[]> {
  const row = await loadActionGalleryRow(params.supabase, params.actionId);
  if (!row || (params.publicOnly && !isPublicAction(row))) return [];
  return storedGallery(row.preparation_data?.spogomiGallery);
}

export async function loadPublishedSpogomiGalleryForAction(params: {
  supabase: SupabaseClient;
  actionId: string;
}): Promise<SpogomiPublicGalleryPhoto[]> {
  return resolvePublicSpogomiGallery(await loadSpogomiGalleryEntries({ ...params, publicOnly: true }));
}

async function updateGalleryAtomically<T>(params: {
  supabase: SupabaseClient;
  actionId: string;
  mutate: (gallery: SpogomiGalleryEntry[]) => { next: SpogomiGalleryEntry[]; result: T } | null;
}): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = await loadActionGalleryRow(params.supabase, params.actionId);
    if (!row) throw new Error("Édition SPOGOMI introuvable.");
    const mutation = params.mutate(storedGallery(row.preparation_data?.spogomiGallery));
    if (!mutation) return null;
    let update = params.supabase
      .from("actions")
      .update({ preparation_data: { ...(row.preparation_data ?? {}), spogomiGallery: mutation.next } })
      .eq("id", params.actionId);
    update = row.preparation_data === null
      ? update.is("preparation_data", null)
      : update.eq("preparation_data", JSON.stringify(row.preparation_data));
    const result = await update.select("id").maybeSingle();
    if (result.error) throw result.error;
    if (result.data) return mutation.result;
  }
  throw new Error("Conflict: la galerie SPOGOMI a été modifiée concurrentement, réessayez.");
}

/** Caller must authorize the event with loadSpogomiEventForOrganizer first. */
export async function upsertSpogomiGalleryPhoto(params: {
  supabase: SupabaseClient;
  actionId: string;
  photo: Parameters<typeof buildSpogomiGalleryPhotoInput>[0];
  actorUserId: string;
}): Promise<SpogomiGalleryEntry> {
  const photo = buildSpogomiGalleryPhotoInput(params.photo, { approvedByUserId: params.actorUserId, approvedAt: new Date().toISOString() });
  const result = await updateGalleryAtomically<SpogomiGalleryEntry>({
    supabase: params.supabase,
    actionId: params.actionId,
    mutate: (current) => ({ next: [...current.filter((item) => item.id !== photo.id), photo], result: photo }),
  });
  if (!result) throw new Error("La photo SPOGOMI n’a pas pu être enregistrée.");
  return result;
}

/** Caller must authorize the event with loadSpogomiEventForOrganizer first. */
export async function withdrawSpogomiGalleryPhoto(params: {
  supabase: SupabaseClient;
  actionId: string;
  photoId: string;
  withdrawnAt: string;
}): Promise<boolean> {
  const result = await updateGalleryAtomically<boolean>({
    supabase: params.supabase,
    actionId: params.actionId,
    mutate: (current) => {
      const target = current.find((photo) => photo.id === params.photoId);
      if (!target || target.status === "draft") return null;
      return {
        next: current.map((photo): SpogomiGalleryEntry => {
          if (photo.id !== params.photoId || photo.status === "draft") return photo;
          return { ...photo, status: "withdrawn", withdrawnAt: params.withdrawnAt };
        }),
        result: true,
      };
    },
  });
  return result ?? false;
}
