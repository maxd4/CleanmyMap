import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261016000006_action_creation_idempotency.sql", import.meta.url),
  "utf8",
);

describe("action creation idempotency migration contract", () => {
  it("stores a nullable retry key and enforces creator-scoped uniqueness", () => {
    expect(migration).toContain("add column if not exists client_request_id text");
    expect(migration).toMatch(/create unique index if not exists idx_actions_creator_client_request[\s\S]+on public\.actions \(created_by_clerk_id, client_request_id\)/i);
    expect(migration).toContain("where client_request_id is not null");
  });
});
