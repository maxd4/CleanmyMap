import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../migrations/20261030000018_community_subscriptions.sql", import.meta.url),
  "utf8",
);

describe("community subscriptions migration contract", () => {
  it("defines the private owner-scoped table and closed value sets", () => {
    expect(migration).toContain("create table if not exists public.community_subscriptions");
    expect(migration).toContain("user_id text not null");
    expect(migration).toContain("kind in ('territory', 'topic')");
    expect(migration).toContain("cadence in ('daily', 'weekly')");
    expect(migration).toContain("topic_id in ('future_actions', 'needs', 'results')");
    expect(migration).toContain("kind = 'territory'");
    expect(migration).toContain("kind = 'topic'");
  });

  it("protects null-shape integrity, uniqueness, timestamps and RLS", () => {
    expect(migration).toContain("community_subscriptions_user_territory_unique_idx");
    expect(migration).toContain("community_subscriptions_user_topic_unique_idx");
    expect(migration).toContain("where kind = 'territory'");
    expect(migration).toContain("where kind = 'topic'");
    expect(migration).toContain("create trigger community_subscriptions_set_updated_at");
    expect(migration).toContain("alter table public.community_subscriptions enable row level security");
    expect(migration).toContain("user_id = coalesce((select auth.jwt()) ->> 'sub', '')");
    expect(migration).toContain("revoke all on table public.community_subscriptions from public, anon");
    expect(migration).toContain("grant select, insert, update, delete on table public.community_subscriptions to authenticated, service_role");
  });
});
