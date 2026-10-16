import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAction } from "./store-create";

describe("action creation idempotency", () => {
  it("returns the creator-scoped action already associated with a retry key before inserting", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "action-created-once" },
      error: null,
    });
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle,
      insert: vi.fn(),
    };
    const supabase = {
      from: vi.fn(() => query),
    } as unknown as SupabaseClient;

    const result = await createAction(supabase, {
      userId: "clerk-user-1",
      clientRequestId: "action-create-retry-key-1",
      payload: {} as never,
      organizers: [],
    });

    expect(result).toEqual({ id: "action-created-once", replayed: true });
    expect(query.insert).not.toHaveBeenCalled();
    expect(query.eq).toHaveBeenNthCalledWith(1, "created_by_clerk_id", "clerk-user-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "client_request_id", "action-create-retry-key-1");
  });
});
