import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260929000000_add_leaderboard_public_opt_in.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

describe("public leaderboard consent migration", () => {
  it("keeps existing accounts private and limits writes to authenticated owners", () => {
    expect(migration).toContain(
      "add column if not exists leaderboard_public_opt_in boolean not null default false",
    );
    expect(migration).toContain(
      "alter column leaderboard_public_opt_in set default false",
    );
    expect(migration).toContain(
      "grant update (leaderboard_public_opt_in) on table public.profiles to authenticated",
    );
    expect(migration).not.toContain("update public.profiles set leaderboard_public_opt_in = true");
  });
});
