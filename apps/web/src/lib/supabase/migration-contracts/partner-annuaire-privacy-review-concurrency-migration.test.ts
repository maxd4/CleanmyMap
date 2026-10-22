import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261022014042_annuaire_privacy_review_concurrency.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("partner annuaire privacy and review concurrency migration contract", () => {
  it("is append-only and guards the audit operation identity", () => {
    expect(migration).toContain("create unique index if not exists uq_admin_operations_audit_operation_id");
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended");
    expect(migration).toContain("partner publication operation id reuse conflict");
    expect(migration).toContain("for update of e, r");
    expect(migration).toContain("grant execute on function public.review_partner_publication");
  });

  it("removes contact-shaped public projections without deleting independent public links", () => {
    expect(migration).toContain("private_admin_contact");
    expect(migration).toContain("contact direct");
    expect(migration).toContain("not like 'mailto:%'");
    expect(migration).toContain("not like 'tel:%'");
    expect(migration).toContain("https links");
  });
});
