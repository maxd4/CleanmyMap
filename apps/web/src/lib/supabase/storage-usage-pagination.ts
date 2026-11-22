import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageUsageObjectRow } from "./storage-usage-types";

const STORAGE_OBJECT_PAGE_SIZE = 1000;

type StorageListEntry = {
  name: string;
  id: string | null;
  created_at: string | null;
  updated_at: string | null;
  metadata: Record<string, unknown> | null;
};

async function listStoragePage(
  supabase: SupabaseClient,
  bucketId: string,
  path: string,
  offset: number,
): Promise<StorageListEntry[]> {
  const { data, error } = await supabase.storage.from(bucketId).list(path, {
    limit: STORAGE_OBJECT_PAGE_SIZE,
    offset,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) {
    throw new Error("Supabase Storage returned an invalid object listing.");
  }

  return data as StorageListEntry[];
}

async function listBucketObjects(
  supabase: SupabaseClient,
  bucketId: string,
): Promise<StorageUsageObjectRow[]> {
  const rows: StorageUsageObjectRow[] = [];
  const pendingPaths = [""];

  while (pendingPaths.length > 0) {
    const path = pendingPaths.shift()!;
    let offset = 0;

    for (;;) {
      const entries = await listStoragePage(supabase, bucketId, path, offset);
      for (const entry of entries) {
        const name = path ? `${path}/${entry.name}` : entry.name;
        if (entry.id === null && entry.metadata === null) {
          pendingPaths.push(name);
          continue;
        }

        rows.push({
          bucket_id: bucketId,
          name,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          metadata: entry.metadata,
        });
      }

      if (entries.length < STORAGE_OBJECT_PAGE_SIZE) break;
      offset += entries.length;
    }
  }

  return rows;
}

/** Enumerates all current Storage objects through the privileged Storage API. */
export async function fetchAllStorageObjects(
  supabase: SupabaseClient,
): Promise<StorageUsageObjectRow[]> {
  const rows: StorageUsageObjectRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.listBuckets({
      limit: STORAGE_OBJECT_PAGE_SIZE,
      offset,
      sortColumn: "id",
      sortOrder: "asc",
    });
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) {
      throw new Error("Supabase Storage returned an invalid bucket listing.");
    }

    for (const bucket of data) {
      rows.push(...await listBucketObjects(supabase, bucket.id));
    }

    if (data.length < STORAGE_OBJECT_PAGE_SIZE) break;
    offset += data.length;
  }

  return rows;
}
