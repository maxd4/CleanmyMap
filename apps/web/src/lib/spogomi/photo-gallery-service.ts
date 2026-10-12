import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildSpogomiGalleryPhotoInput,
  parseSpogomiGalleryPhoto,
  resolvePublicSpogomiGallery,
  type SpogomiGalleryPhoto,
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
function storedGallery(value: unknown): SpogomiGalleryPhoto[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map(parseSpogomiGalleryPhoto)
    .filter((photo): photo is SpogomiGalleryPhoto => Boolean(photo))
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
}): Promise<SpogomiGalleryPhoto[]> {
  const row = await loadActionGalleryRow(params.supabase, params.actionId);
  if (!row || (params.publicOnly && !isPublicAction(row))) return [];
  return storedGallery(row.preparation_data?.spogomiGallery);
}

export async function loadPublishedSpogomiGalleryForAction(params: {
  supabase: SupabaseClient;
  actionId: string;
}): Promise<SpogomiGalleryPhoto[]> {
  return resolvePublicSpogomiGallery(await loadSpogomiGalleryEntries({ ...params, publicOnly: true }));
}

/** Caller must authorize the event with loadSpogomiEventForOrganizer first. */
export async function upsertSpogomiGalleryPhoto(params: {
  supabase: SupabaseClient;
  actionId: string;
  photo: Parameters<typeof buildSpogomiGalleryPhotoInput>[0];
}): Promise<SpogomiGalleryPhoto> {
  const row = await loadActionGalleryRow(params.supabase, params.actionId);
  if (!row) throw new Error("Édition SPOGOMI introuvable.");
  const photo = buildSpogomiGalleryPhotoInput(params.photo);
  const preparationData = row.preparation_data ?? {};
  const current = storedGallery(preparationData.spogomiGallery);
  const next = [...current.filter((item) => item.id !== photo.id), photo];
  const result = await params.supabase
    .from("actions")
    .update({ preparation_data: { ...preparationData, spogomiGallery: next } })
    .eq("id", params.actionId);
  if (result.error) throw result.error;
  return photo;
}

/** Caller must authorize the event with loadSpogomiEventForOrganizer first. */
export async function withdrawSpogomiGalleryPhoto(params: {
  supabase: SupabaseClient;
  actionId: string;
  photoId: string;
  withdrawnAt: string;
}): Promise<boolean> {
  const row = await loadActionGalleryRow(params.supabase, params.actionId);
  if (!row) throw new Error("Édition SPOGOMI introuvable.");
  const current = storedGallery(row.preparation_data?.spogomiGallery);
  const target = current.find((photo) => photo.id === params.photoId);
  if (!target) return false;
  const next = current.map((photo) => photo.id === params.photoId
    ? { ...photo, status: "withdrawn" as const, withdrawnAt: params.withdrawnAt, publishedAt: photo.publishedAt }
    : photo);
  const result = await params.supabase
    .from("actions")
    .update({ preparation_data: { ...(row.preparation_data ?? {}), spogomiGallery: next } })
    .eq("id", params.actionId);
  if (result.error) throw result.error;
  return true;
}
