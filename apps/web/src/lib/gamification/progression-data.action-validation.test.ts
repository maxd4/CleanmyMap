import { describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { loadValidatedActionIdsForUser } from "./progression-data";

function createActionsQuery(data: unknown[]) {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
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
    const rows = (data as Array<{ action_id?: string; status?: string; validated_by_admin?: boolean; is_duplicate?: boolean; is_deleted?: boolean; is_test?: boolean }>).filter((row) => {
      if (requestedActionIds && row.action_id && !requestedActionIds.includes(row.action_id)) {
        return false;
      }
      if (row.status === "draft" || row.status === "deleted" || row.status === "incomplete") {
        return false;
      }
      if (row.validated_by_admin === false) {
        return false;
      }
      if (row.is_duplicate || row.is_deleted || row.is_test) {
        return false;
      }
      return true;
    });
    return { data: rows, error: null };
  });
  return chain;
}

describe("loadValidatedActionIdsForUser", () => {
  it("counts only approved spontaneous actions with at least one validated form", async () => {
    const spontaneousNotes = appendActionMetadataToNotes("Action de terrain", {
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
        latitude: null,
        longitude: null,
        waste_kg: 0,
        cigarette_butts: 0,
        volunteers_count: 1,
        duration_minutes: 45,
        status: "approved",
        notes: spontaneousNotes,
        manual_drawing: null,
      },
      {
        id: "action-2",
        created_at: "2026-01-02",
        created_by_clerk_id: "user-1",
        actor_name: "Alice",
        action_date: "2026-01-02",
        location_label: "Parc B",
        latitude: null,
        longitude: null,
        waste_kg: 0,
        cigarette_butts: 0,
        volunteers_count: 1,
        duration_minutes: 30,
        status: "approved",
        notes: spontaneousNotes,
        manual_drawing: null,
      },
      {
        id: "action-3",
        created_at: "2026-01-03",
        created_by_clerk_id: "user-1",
        actor_name: "Alice",
        action_date: "2026-01-03",
        location_label: "Parc C",
        latitude: null,
        longitude: null,
        waste_kg: 0,
        cigarette_butts: 0,
        volunteers_count: 1,
        duration_minutes: 20,
        status: "pending",
        notes: spontaneousNotes,
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
        action_id: "action-1",
        group_id: "g1",
        status: "validated",
        created_at: "2026-01-05",
        validated_by_admin: true,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
      {
        action_id: "action-2",
        group_id: "g2",
        status: "draft",
        created_at: "2026-01-06",
        validated_by_admin: false,
        is_duplicate: false,
        is_deleted: false,
        is_test: false,
      },
      {
        action_id: "action-3",
        group_id: "g3",
        status: "validated",
        created_at: "2026-01-07",
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

    const validatedActionIds = await loadValidatedActionIdsForUser(supabase, "user-1");

    expect(Array.from(validatedActionIds)).toEqual(["action-1"]);
  });
});
