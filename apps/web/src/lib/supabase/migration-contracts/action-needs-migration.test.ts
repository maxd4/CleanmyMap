import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261030000019_action_needs.sql"),
  "utf8",
);

describe("action_needs migration STATIC_CONTRACT", () => {
  it("defines the exact schema, categories, statuses and bounds", () => {
    expect(migration).toContain("create table if not exists public.action_needs");
    expect(migration).toContain("action_id uuid not null references public.actions(id) on delete cascade");
    expect(migration).toContain("category in (");
    for (const category of ["materiel", "transport", "renfort_benevole", "communication", "photo_video", "cartographie", "expertise", "logistique"]) {
      expect(migration).toContain(`'${category}'`);
    }
    expect(migration).toContain("status in ('open', 'fulfilled', 'cancelled')");
    expect(migration).toContain("char_length(btrim(title)) between 3 and 80");
    expect(migration).toContain("char_length(btrim(description)) between 1 and 500");
    expect(migration).toContain("char_length(btrim(quantity_label)) <= 80");
    expect(migration).not.toContain("expired");
  });

  it("defines the requested indexes, lifecycle invariants and server-only access", () => {
    expect(migration).toContain("action_needs_action_status_created_at_idx");
    expect(migration).toContain("action_needs_category_status_created_at_idx");
    expect(migration).toContain("action_needs_open_expires_at_idx");
    expect(migration).toContain("where status = 'open'");
    expect(migration).toContain("action_need_terminal_state_immutable");
    expect(migration).toContain("action_need_fulfilled_at_required");
    expect(migration).toContain("action_need_fulfilled_at_must_be_null");
    expect(migration).toContain("alter table public.action_needs enable row level security");
    expect(migration).toContain("revoke all on table public.action_needs from public, anon, authenticated");
    expect(migration).toContain("grant select, insert, update on table public.action_needs to service_role");
    expect(migration).toContain("create policy action_needs_service_role_insert");
    expect(migration).toContain("create policy action_needs_service_role_update");
    expect(migration).toContain("grant execute on function public.enforce_action_need_lifecycle() to service_role");
    expect(migration).not.toContain("create policy action_needs_public");
    expect(migration).not.toContain("grant select on table public.action_needs to anon");
    expect(migration).not.toContain("grant select on table public.action_needs to authenticated");
  });
});
