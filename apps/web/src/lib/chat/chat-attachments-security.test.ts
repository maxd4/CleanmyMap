import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260831010000_harden_chat_attachments_privacy.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

const bucketMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260531000005_create_chat_attachments_bucket.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

const svgMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260926000003_restrict_chat_attachment_mimes.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

const sizeMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260927000005_chat_attachment_size_limit.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

const pathMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260927000007_chat_attachment_paths.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

const submitHook = readFileSync(
  new URL("../../components/chat/hooks/use-chat-submit.ts", import.meta.url),
  "utf8",
).concat(
  readFileSync(
    new URL("../../components/chat/hooks/use-chat-submit.helpers.ts", import.meta.url),
    "utf8",
  ),
);
const attachmentContract = readFileSync(
  new URL("./chat-attachments.ts", import.meta.url),
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

  it("uses short-lived signed URLs instead of public object URLs", () => {
    expect(submitHook).toContain("createSignedUrl(filePath, CHAT_ATTACHMENT_SIGNED_URL_TTL_SECONDS)");
    expect(submitHook).not.toContain("getPublicUrl(filePath)");
  });

  it("keeps Storage MIME allowlisting free of video types", () => {
    expect(bucketMigration).toContain("allowed_mime_types");
    expect(bucketMigration).not.toMatch(/video\//i);
  });

  it("removes SVG from the effective MIME allowlist without rewriting legacy rows", () => {
    expect(svgMigration).toContain("update storage.buckets");
    expect(svgMigration).toContain("array_remove");
    expect(svgMigration).toContain("'image/svg+xml'");
    expect(svgMigration).toContain("where id = 'chat-attachments'");
    expect(svgMigration).toContain("existing attachment rows remain readable");
  });

  it("enforces the 8 MiB business limit at the private Storage boundary", () => {
    expect(sizeMigration).toContain("update storage.buckets");
    expect(sizeMigration).toContain("set file_size_limit = 8 * 1024 * 1024");
    expect(sizeMigration).toContain("where id = 'chat-attachments'");
    expect(attachmentContract).toContain('CHAT_ATTACHMENTS_BUCKET = "chat-attachments"');
    expect(submitHook).not.toContain("/api/chat/upload");
  });

  it("stores durable paths for new rows and keeps poll attachments forbidden", () => {
    expect(pathMigration).toContain("add column if not exists attachment_path text");
    expect(pathMigration).toContain("attachment_path is null or btrim(attachment_path) <> ''");
    expect(pathMigration).toContain("attachment_url is null and attachment_path is null");
    expect(pathMigration).toContain("legacy attachment_url rows stay readable");
  });
});
