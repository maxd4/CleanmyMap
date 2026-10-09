import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261009000002_atomic_action_organizer_sync.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("atomic action organizer synchronization contract", () => {
  it("locks the action and never deletes the action row", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("delete from public.action_organizers");
    expect(migration).not.toMatch(/delete\s+from\s+public\.actions/i);
  });

  it("rejects malformed and duplicate account payloads before replacement", () => {
    expect(migration).toContain("organizers must be a JSON array");
    expect(migration).toContain("organizer ids must be unique");
    expect(migration).toContain("organizer id and label are required");
  });

  it("normalizes a non-empty payload to one primary and keeps the RLS boundary", () => {
    expect(migration).toMatch(/coalesce\([\s\S]*?min\(ordinality\) filter \(where requested_primary\),[\s\S]*?min\(ordinality\)[\s\S]*?\)/);
    expect(migration).toContain("security invoker");
    expect(migration).toContain("revoke all on function public.replace_action_organizers(uuid, jsonb)");
    expect(migration).toContain("grant execute on function public.replace_action_organizers(uuid, jsonb)");
  });
});
