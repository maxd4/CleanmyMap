import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260927000000_harden_organizer_directory_server_only.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

describe("organizer directory server-only migration", () => {
  it("keeps RLS and removes the authenticated read policy", () => {
    expect(migration).toContain("alter table public.organizer_directory_entries enable row level security;");
    expect(migration).toContain(
      "drop policy if exists organizer_directory_entries_select_authenticated on public.organizer_directory_entries;",
    );
  });

  it("keeps only the server projection privileges", () => {
    expect(migration).toContain(
      "revoke all privileges on table public.organizer_directory_entries from public, anon, authenticated, service_role;",
    );
    expect(migration).toContain(
      "grant select, insert on table public.organizer_directory_entries to service_role;",
    );
    expect(migration).not.toMatch(/grant [^;]* on table public\.organizer_directory_entries to (public|anon|authenticated)/i);
  });
});
