import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261016000001_feedback_bug_screenshot_evidence.sql", import.meta.url),
  "utf8",
);
const attemptPathMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261016000002_feedback_bug_screenshot_attempt_paths.sql", import.meta.url),
  "utf8",
);

describe("feedback bug screenshot migration contract", () => {
  it("reuses the private bucket without adding public grants or a second storage source", () => {
    expect(migration).toContain("alter table public.community_bug_reports");
    expect(migration).toContain("signalement-evidence");
    expect(migration).toContain("screenshot_upload_state");
    expect(migration).not.toContain("create policy");
    expect(migration).not.toContain("insert into storage.buckets");
    expect(migration).not.toContain("grant select on public.community_bug_reports to anon");
    expect(migration).not.toContain("grant select on public.community_bug_reports to authenticated");
  });

  it("restricts metadata to Bug reports and the canonical image limits", () => {
    expect(migration).toContain("or report_type = 'bug'");
    expect(migration).toContain("between 1 and 5242880");
    expect(migration).toContain("'image/jpeg', 'image/png', 'image/webp'");
    expect(migration).toContain("screenshot_upload_state in ('pending', 'ready', 'failed')");
  });

  it("preserves legacy paths while allowing immutable retry attempt paths", () => {
    expect(attemptPathMigration).toContain(
      "^feedback/[0-9a-fA-F-]{36}/screenshot(/[0-9a-fA-F-]{36})?$",
    );
    expect(attemptPathMigration).toContain(
      "drop constraint if exists community_bug_reports_screenshot_path_check",
    );
    expect(attemptPathMigration).not.toContain("create policy");
  });
});
