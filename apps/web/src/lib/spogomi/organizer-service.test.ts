import { beforeEach, describe, expect, it, vi } from "vitest";

const loadSpogomiEventForOrganizer = vi.hoisted(() => vi.fn());

vi.mock("./preparation-service", () => ({
  loadSpogomiEventForOrganizer,
}));

import { listSpogomiEventsForOrganizer } from "./organizer-service";

describe("listSpogomiEventsForOrganizer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only events accepted by the canonical organizer authorization helper", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [{ id: "private-1" }, { id: "other-1" }, { id: "private-2" }], error: null }),
        })),
      })),
    } as never;
    loadSpogomiEventForOrganizer
      .mockResolvedValueOnce({ id: "private-1", public_visibility: "private" })
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(null);

    await expect(listSpogomiEventsForOrganizer(supabase, "user-1")).resolves.toEqual([
      { id: "private-1", public_visibility: "private" },
    ]);
    expect(loadSpogomiEventForOrganizer).toHaveBeenCalledWith(supabase, "private-1", "user-1");
    expect(loadSpogomiEventForOrganizer).toHaveBeenCalledWith(supabase, "other-1", "user-1");
    expect(loadSpogomiEventForOrganizer).toHaveBeenCalledWith(supabase, "private-2", "user-1");
  });

  it("fails closed when the catalog query fails", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error("database unavailable") }),
        })),
      })),
    } as never;
    await expect(listSpogomiEventsForOrganizer(supabase, "user-1")).rejects.toThrow("database unavailable");
    expect(loadSpogomiEventForOrganizer).not.toHaveBeenCalled();
  });
});
