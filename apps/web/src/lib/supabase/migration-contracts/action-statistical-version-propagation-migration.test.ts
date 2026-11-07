import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261107000003_action_statistical_version_propagation.sql",
    import.meta.url,
  ),
  "utf8",
);
const proof = readFileSync(
  new URL(
    "../../../../supabase/tests/action-statistical-version-propagation.pgtap.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("action statistical version propagation migration", () => {
  it("captures direct published edits without replacing historical snapshots", () => {
    expect(migration).toContain("alter table public.action_statistical_versions");
    expect(migration).toContain("department_code text");
    expect(migration).toContain("create or replace function public.capture_action_statistical_version()");
    expect(migration).toContain("v_current.publication_kind = 'approved_published'");
    expect(migration).toContain("v_current.volunteers_count is not distinct from new.volunteers_count");
    expect(migration).toContain("v_current.waste_kg is not distinct from new.waste_kg");
    expect(migration).toContain("v_current.cigarette_butts is not distinct from new.cigarette_butts");
    expect(migration).toContain("v_current.duration_minutes is not distinct from new.duration_minutes");
    expect(migration).toContain("v_current.action_context is not distinct from new.action_context");
    expect(migration).toContain("v_current.children_count is not distinct from new.children_count");
    expect(migration).toContain("v_current.adult_count is not distinct from new.adult_count");
    expect(migration).toContain("v_current.retired_count is not distinct from new.retired_count");
    expect(migration).toContain("new.department_code, new.department_name");
    expect(migration).toContain("pg_advisory_xact_lock");
  });

  it("records source revisions and makes contribution application idempotent", () => {
    expect(migration).toContain("public.public_impact_action_contribution_applications");
    expect(migration).toContain("primary key (action_id, source_version_id)");
    expect(migration).toContain("create or replace function public.record_public_impact_action_contribution_application()");
    expect(migration).toContain("on conflict (action_id, source_version_id) do nothing");
    expect(migration).toContain("trg_public_impact_action_contribution_application_audit");
    expect(migration).toContain("'participants'");
    expect(migration).toContain("'composition'");
    expect(migration).toContain("'waste_kg'");
    expect(migration).toContain("'cigarette_butts'");
    expect(migration).toContain("'duration_minutes'");
    expect(migration).toContain("'context'");
    expect(proof).toContain("rollback;");
  });

  it("keeps reference consumers on snapshots and preserves the invoker boundary", () => {
    expect(migration).toContain("create or replace view public.action_pollution_score_reference_population");
    expect(migration).toContain("from public.action_statistical_versions v");
    expect(migration).toContain("v.volunteers_count::numeric as volunteer_count");
    expect(migration).toContain("and v.volunteers_count >= 1");
    expect(migration).toContain("and v.duration_minutes > 0");
    expect(migration).toContain("create function public.action_pollution_score_references_v2()");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("from public.action_pollution_score_reference_population p");
    expect(migration).toContain("create or replace function public.action_collection_context_reference_averages_v1(");
    expect(migration).toContain("from public.action_statistical_versions v");
    expect(migration).toContain("create or replace view public.action_map_statistical_source");
    expect(migration).toContain("coalesce(a.data_provenance, 'unknown') <> 'test'");
    expect(migration).toContain("case when v.action_id is not null then v.action_date else a.action_date end");
    expect(migration).toContain("coalesce(v.waste_kg, 0)");
    expect(migration).toContain("security invoker\nset search_path = public, pg_catalog\nas $$\nwith effective_limit");
    expect(migration).not.toMatch(/action_participants|action_registrations/);
  });

  it("keeps the executable proof plan synchronized", () => {
    const declaredPlan = Number(proof.match(/^\s*select\s+plan\((\d+)\);/m)?.[1]);
    const executableAssertions = proof.match(/^\s*select\s+(?:is|ok|lives_ok)\s*\(/gm) ?? [];

    expect(declaredPlan).toBe(34);
    expect(executableAssertions).toHaveLength(declaredPlan);
    expect(proof).toContain("pending correction does not create a statistical version");
    expect(proof).toContain("replaying the same published payload does not create a duplicate version");
    expect(proof).toContain("test provenance never creates an authoritative statistical version");
  });
});
