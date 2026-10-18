import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../../supabase/migrations/20261018000006_report_generation_publications.sql", import.meta.url), "utf8");

describe("report_generation_publications migration [STATIC_CONTRACT]", () => {
  it("stores a safe publication projection without duplicating snapshots", () => {
    expect(migration).toContain("create table if not exists public.report_generation_publications");
    expect(migration).toContain("generation_id uuid not null unique references public.report_generations(id)");
    expect(migration).toContain("artifact_id uuid not null references public.report_generation_pdf_artifacts(id)");
    expect(migration).not.toContain("snapshot jsonb");
    expect(migration).toContain("where revoked_at is null");
  });

  it("keeps the table server-only", () => {
    expect(migration).toContain("alter table public.report_generation_publications enable row level security");
    expect(migration).toContain("revoke all on public.report_generation_publications from anon, authenticated, public");
    expect(migration).toContain("grant select, insert, update on public.report_generation_publications to service_role");
  });
});
