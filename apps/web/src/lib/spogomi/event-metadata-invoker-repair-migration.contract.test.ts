import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261109180000_spogomi_event_metadata_invoker_repair.sql", import.meta.url), "utf8");

describe("SPOGOMI event metadata invoker repair STATIC_CONTRACT", () => {
  it("keeps one invoker owner and removes the private delegation path", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("perform set_config('spogomi.change_actor', btrim(p_actor_clerk_id), true)");
    expect(migration).toContain("for update");
    expect(migration).toContain("SPOGOMI event changed since the page was loaded");
    expect(migration).toContain("drop function public.spogomi_update_event_metadata_apply");
    expect(migration).toContain("revoke all on function public.spogomi_update_event_metadata");
    expect(migration).toContain("grant execute on function public.spogomi_update_event_metadata");
    expect(migration).not.toContain("return public.spogomi_update_event_metadata_apply");
  });

  it("preserves the event mutation guards and actor-bearing write context", () => {
    expect(migration).toContain("Changing the mode of an existing SPOGOMI event is not allowed");
    expect(migration).toContain("SPOGOMI mode and team-size rules are immutable after composition lock");
    expect(migration).toContain("A Casual team is outside the event bounds");
    expect(migration).toContain("perform set_config('spogomi.composition_write_context', 'event_metadata_update', true)");
    expect(migration).toContain("public.spogomi_team_requires_composition_correction");
  });
});
