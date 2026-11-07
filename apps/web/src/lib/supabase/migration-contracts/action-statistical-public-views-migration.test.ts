import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261107000005_secure_public_statistical_views.sql",
    import.meta.url,
  ),
  "utf8",
);
const contract = readFileSync(
  new URL(
    "../../../../supabase/tests/action-statistical-public-views.pgtap.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("secure public statistical views migration", () => {
  it("closes direct view access and keeps the explicit RPC contracts", () => {
    expect(migration).toContain("security_invoker = true");
    expect(migration).toContain("revoke all on public.action_map_statistical_source");
    expect(migration).toContain("revoke all on public.action_pollution_score_reference_population");
    expect(migration).toContain("grant select on public.action_map_statistical_source to service_role");
    expect(migration).toContain("grant select on public.action_pollution_score_reference_population to service_role");
    expect(migration).toContain("alter function public.actions_map_feed(");
    expect(migration).toContain("security definer;");
    expect(migration).toContain("alter function public.action_pollution_score_references_v2()");
  });

  it("revalidates the mutable action boundary without replacing snapshot values", () => {
    expect(migration).toContain("join public.actions a on a.id = v.action_id");
    expect(migration).toContain("public.is_current_public_action_statistical_eligible(");
    expect(migration).toContain("v.waste_kg");
    expect(migration).toContain("v.cigarette_butts");
    expect(migration).toContain("v.volunteers_count");
    expect(migration).not.toContain("grant select on public.action_map_statistical_source to anon");
    expect(migration).not.toContain("grant select on public.action_pollution_score_reference_population to authenticated");
  });

  it("declares transactional browser, revocation and historical-snapshot coverage", () => {
    expect(contract).toContain("begin;");
    expect(contract).toContain("select plan(30);");
    expect(contract).toContain("has_table_privilege('anon'");
    expect(contract).toContain("action_statistical_versions limit 1");
    expect(contract).toContain("moderation_visibility = 'hidden'");
    expect(contract).toContain("access_mode = 'invite_link'");
    expect(contract).toContain("status = 'rejected'");
    expect(contract).toContain("status = 'cancelled'");
    expect(contract).toContain("data_provenance = 'test'");
    expect(contract).toContain("rehabilitation with the same published payload");
  });

  it("keeps direct snapshot reads privileged while sharing only an aggregate baseline", () => {
    expect(contract).toMatch(/grant select on pollution_reference_before\s+to anon, authenticated/i);

    let currentRole = "unknown";
    const directSnapshotReadRoles: string[] = [];
    for (const line of contract.split(/\r?\n/u)) {
      const roleMatch = line.match(/^set local role (\w+);$/u);
      if (roleMatch) currentRole = roleMatch[1];
      if (line.trimStart().startsWith("(select") && line.includes("from public.action_statistical_versions")) {
        directSnapshotReadRoles.push(currentRole);
      }
    }

    expect(directSnapshotReadRoles).toEqual(["service_role", "service_role", "service_role", "service_role"]);
    expect(contract).toContain("anon cannot read raw statistical snapshots");
    expect(contract).toContain("authenticated cannot read raw statistical snapshots");
  });
});
