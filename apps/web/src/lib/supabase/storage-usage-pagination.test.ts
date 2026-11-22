import { describe, expect, it, vi } from "vitest";
import { fetchAllStorageObjects } from "./storage-usage-pagination";

describe("Storage usage object enumeration", () => {
  it("lists buckets through the Storage API and includes nested object paths", async () => {
    const list = vi.fn(async (path: string) => {
      if (path === "") {
        return {
          data: [
            { name: "root.jpg", id: "root-id", created_at: "2026-11-01", updated_at: null, metadata: { size: 10 } },
            { name: "photos", id: null, created_at: null, updated_at: null, metadata: null },
          ],
          error: null,
        };
      }
      return {
        data: [
          { name: "nested.jpg", id: "nested-id", created_at: "2026-11-02", updated_at: null, metadata: { size: 20 } },
        ],
        error: null,
      };
    });
    const listBuckets = vi.fn(async () => ({
      data: [{ id: "action-media" }],
      error: null,
    }));
    const client = {
      storage: {
        listBuckets,
        from: vi.fn(() => ({ list })),
      },
    } as never;

    const objects = await fetchAllStorageObjects(client);

    expect(listBuckets).toHaveBeenCalledWith({
      limit: 1000,
      offset: 0,
      sortColumn: "id",
      sortOrder: "asc",
    });
    expect(list).toHaveBeenNthCalledWith(1, "", expect.objectContaining({ limit: 1000, offset: 0 }));
    expect(list).toHaveBeenNthCalledWith(2, "photos", expect.objectContaining({ limit: 1000, offset: 0 }));
    expect(objects).toEqual([
      {
        bucket_id: "action-media",
        name: "root.jpg",
        created_at: "2026-11-01",
        updated_at: null,
        metadata: { size: 10 },
      },
      {
        bucket_id: "action-media",
        name: "photos/nested.jpg",
        created_at: "2026-11-02",
        updated_at: null,
        metadata: { size: 20 },
      },
    ]);
  });

  it("fails the capture instead of reporting a partial inventory", async () => {
    const client = {
      storage: {
        listBuckets: vi.fn(async () => ({ data: [{ id: "private" }], error: null })),
        from: vi.fn(() => ({
          list: vi.fn(async () => ({ data: null, error: { message: "access denied" } })),
        })),
      },
    } as never;

    await expect(fetchAllStorageObjects(client)).rejects.toThrow("access denied");
  });

  it("continues through bucket and object pages at the provider limit", async () => {
    const buckets = Array.from({ length: 1000 }, (_, index) => ({ id: `bucket-${index}` }));
    const listBuckets = vi.fn(async ({ offset }: { offset: number }) => ({
      data: offset === 0 ? buckets : [{ id: "final-bucket" }],
      error: null,
    }));
    const list = vi.fn(async (bucketId: string, _path: string, options: { offset: number }) => {
      if (bucketId !== "final-bucket") return { data: [], error: null };
      return {
        data: options.offset === 0
          ? Array.from({ length: 1000 }, (_, index) => ({
            name: `object-${index}.jpg`,
            id: `id-${index}`,
            created_at: null,
            updated_at: null,
            metadata: { size: index },
          }))
          : [{
            name: "last.jpg",
            id: "last-id",
            created_at: null,
            updated_at: null,
            metadata: { size: 2048 },
          }],
        error: null,
      };
    });
    const client = {
      storage: {
        listBuckets,
        from: vi.fn((bucketId: string) => ({
          list: (path: string, options: { offset: number }) => list(bucketId, path, options),
        })),
      },
    } as never;

    const objects = await fetchAllStorageObjects(client);

    expect(listBuckets).toHaveBeenCalledTimes(2);
    expect(listBuckets).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 1000 }));
    expect(list).toHaveBeenCalledWith("final-bucket", "", expect.objectContaining({ offset: 1000 }));
    expect(objects).toHaveLength(1001);
    expect(objects.at(-1)).toEqual({
      bucket_id: "final-bucket",
      name: "last.jpg",
      created_at: null,
      updated_at: null,
      metadata: { size: 2048 },
    });
  });
});
