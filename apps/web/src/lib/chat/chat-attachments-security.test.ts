import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260831010000_harden_chat_attachments_privacy.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

const submitHook = readFileSync(
  new URL("../../components/chat/hooks/use-chat-submit.ts", import.meta.url),
  "utf8",
);

describe("chat attachment privacy contract", () => {
  it("keeps the bucket private and binds object access to the owner", () => {
    expect(migration).toContain(
      "update storage.buckets set public = false where id = 'chat-attachments';",
    );
    expect(migration).toContain(
      'create policy "chat attachments owner read" on storage.objects for select',
    );
    expect(migration).toContain(
      "owner_id = coalesce((select auth.jwt()) ->> 'sub', '')",
    );
    expect(migration).toContain(
      "split_part(name, '/', 1) in ('community', 'dm', 'admin_elu', 'territory', 'bug_report')",
    );
    expect(migration).not.toMatch(/create\s+policy\s+"chat attachments public read"/i);
  });

  it("uses expiring signed URLs instead of public object URLs", () => {
    expect(submitHook).toContain("createSignedUrl(filePath, 120 * 24 * 60 * 60)");
    expect(submitHook).not.toContain("getPublicUrl(filePath)");
  });
});
