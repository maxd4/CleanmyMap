import { describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { loadValidatedCompleteActionCountForUser } from "./progression-data";

function createActionsQuery(data: unknown[]) {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(async () => ({ data, error: null }));
  return chain;
}

function createFormsQuery(data: unknown[]) {
  let requestedActionIds: string[] | null = null;
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.in = vi.fn((field: string, values: string[]) => {
    if (field === "action_id") {
      requestedActionIds = values;
    }
    return chain;
  });
  chain.neq = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.order = vi.fn(async () => {
    const rows = (data as Array<{ action_id?: string }>).filter((row) => {
      if (requestedActionIds && row.action_id && !requestedActionIds.includes(row.action_id)) {
        return false;
      }
      return true;
    });
    return { data: rows, error: null };
  });
  return chain;
}

describe("loadValidatedCompleteActionCountForUser", () => {
  it("counts only validated approved actions with complete data", async () => {
    const completeNotes = appendActionMetadataToNotes("Action de terrain", {
      associationName: "Action spontanée",
    });

    const actions = [
      {
        id: "action-1",
        created_at: "2026-01-01",
        created_by_clerk_id: "user-1",
        actor_name: "Alice",
        action_date: "2026-01-01",
        location_label: "Parc A",
        latitude: 48.85,
        longitude: 2.35,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "approved",
        notes: completeNotes,
        manual_drawing: null,
      },
      {
        id: "action-2",
        created_at: "2026-01-02",
        created_by_clerk_id: "user-1",
        actor_name: null,
        action_date: "2026-01-02",
        location_label: "Parc B",
        latitude: 48.86,
        longitude: 2.34,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "approved",
        notes: completeNotes,
        manual_drawing: null,
      },
      {
        id: "action-3",
        created_at: "2026-01-03",
        created_by_clerk_id: "user-1",
        actor_name: "Alice",
        action_date: "2026-01-03",
        location_label: "Parc C",
        latitude: 48.87,
        longitude: 2.33,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "pending",
        notes: completeNotes,
        manual_drawing: null,
      },
    ];

    const forms = [
      {
        action_id: "action-1",
        group_id: "g1",
        status: "validated",
        created_at: "2026-01-04",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
      {
        action_id: "action-2",
        group_id: "g2",
        status: "validated",
        created_at: "2026-01-04",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
      {
        action_id: "action-3",
        group_id: "g3",
        status: "validated",
        created_at: "2026-01-04",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
    ];

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "actions") {
          return createActionsQuery(actions);
        }
        if (table === "action_organizers") {
          const chain: any = {};
          chain.select = vi.fn(() => chain);
          chain.eq = vi.fn(() => chain);
          chain.limit = vi.fn(async () => ({ data: [], error: null }));
          return chain;
        }
        if (table === "forms") {
          return createFormsQuery(forms);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as any;

    const count = await loadValidatedCompleteActionCountForUser(supabase, "user-1");

    expect(count).toBe(1);
  });

  it("returns the same count when approved rows are preloaded", async () => {
    const completeNotes = appendActionMetadataToNotes("Action de terrain", {
      associationName: "Action spontanée",
    });

    const actions = [
      {
        id: "action-1",
        created_at: "2026-01-01",
        created_by_clerk_id: "user-1",
        actor_name: "Alice",
        action_date: "2026-01-01",
        location_label: "Parc A",
        latitude: 48.85,
        longitude: 2.35,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "approved",
        notes: completeNotes,
        manual_drawing: null,
      },
      {
        id: "action-2",
        created_at: "2026-01-02",
        created_by_clerk_id: "user-1",
        actor_name: null,
        action_date: "2026-01-02",
        location_label: "Parc B",
        latitude: 48.86,
        longitude: 2.34,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "approved",
        notes: completeNotes,
        manual_drawing: null,
      },
      {
        id: "action-3",
        created_at: "2026-01-03",
        created_by_clerk_id: "user-1",
        actor_name: "Alice",
        action_date: "2026-01-03",
        location_label: "Parc C",
        latitude: 48.87,
        longitude: 2.33,
        waste_kg: 3,
        cigarette_butts: 12,
        volunteers_count: 4,
        duration_minutes: 45,
        status: "pending",
        notes: completeNotes,
        manual_drawing: null,
      },
    ];

    const forms = [
      {
        action_id: "action-1",
        group_id: "g1",
        status: "validated",
        created_at: "2026-01-04",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
      {
        action_id: "action-2",
        group_id: "g2",
        status: "validated",
        created_at: "2026-01-04",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
      {
        action_id: "action-3",
        group_id: "g3",
        status: "validated",
        created_at: "2026-01-04",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
    ];

    const directSupabase = {
      from: vi.fn((table: string) => {
        if (table === "actions") {
          return createActionsQuery(actions);
        }
        if (table === "action_organizers") {
          const chain: any = {};
          chain.select = vi.fn(() => chain);
          chain.eq = vi.fn(() => chain);
          chain.limit = vi.fn(async () => ({ data: [], error: null }));
          return chain;
        }
        if (table === "forms") {
          return createFormsQuery(forms);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as any;

    const preloadedSupabase = {
      from: vi.fn((table: string) => {
        if (table === "actions") {
          throw new Error("actions table should not be queried when rows are preloaded");
        }
        if (table === "action_organizers") {
          const chain: any = {};
          chain.select = vi.fn(() => chain);
          chain.eq = vi.fn(() => chain);
          chain.limit = vi.fn(async () => ({ data: [], error: null }));
          return chain;
        }
        if (table === "forms") {
          return createFormsQuery(forms);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as any;

    const directCount = await loadValidatedCompleteActionCountForUser(directSupabase, "user-1");
    const preloadedCount = await loadValidatedCompleteActionCountForUser(preloadedSupabase, "user-1", {
      actionRows: actions as any,
    });

    expect(directCount).toBe(1);
    expect(preloadedCount).toBe(1);
  });
});
