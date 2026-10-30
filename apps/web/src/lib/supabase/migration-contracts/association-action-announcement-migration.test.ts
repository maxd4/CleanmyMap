import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261030000010_association_action_announcement.sql", import.meta.url),
  "utf8",
);
const idempotencyMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261030000014_association_action_notification_idempotency.sql", import.meta.url),
  "utf8",
);

describe("association action announcement migration STATIC_CONTRACT", () => {
  it("uses action_id plus a partial unique key and never related_event_id", () => {
    expect(migration).toContain("official_action_publication_id uuid");
    expect(migration).toContain("create unique index if not exists idx_app_messages_official_action_publication");
    expect(migration).toContain("action_id = official_action_publication_id");
    expect(migration).toContain("related_event_id is null");
    expect(migration).not.toMatch(/insert\s+into\s+public\.community_events/i);
  });

  it("keeps the official topic server-only and makes retry fan-out source-idempotent", () => {
    expect(migration).toContain("not (\n    message_kind = 'announcement'");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("association_action_publication");
    expect(migration).toContain("sourceId");
    expect(migration).toContain("evenements_associatifs");
  });

  it("adds a database uniqueness owner for concurrent official notification fan-out", () => {
    expect(idempotencyMigration).toContain(
      "create unique index if not exists app_notifications_association_action_publication_unique_idx",
    );
    expect(idempotencyMigration).toContain("type = 'community'");
    expect(idempotencyMigration).toContain("payload ->> 'sourceType' = 'association_action_publication'");
    expect(idempotencyMigration).toContain("payload ->> 'sourceId'");
    expect(idempotencyMigration).toContain("on conflict do nothing");
    expect(idempotencyMigration).toContain("set search_path = pg_catalog");
    expect(idempotencyMigration).toContain("from public, anon, authenticated");
    expect(idempotencyMigration).toContain("to service_role");
  });

  it("fails closed on pre-existing duplicates instead of deleting history", () => {
    expect(idempotencyMigration).toContain("Duplicate official association-action notifications");
    expect(idempotencyMigration).not.toMatch(/delete\s+from\s+public\.app_notifications/i);
  });
});
