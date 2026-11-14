import { describe, expect, it } from "vitest";
import { readMigration } from "./read-migration";

const migration = readMigration(
  import.meta.url,
  "20261114000009_harden_supabase_advisor_findings.sql",
);

const directRolePolicies = [
  ["action_retrospectives_service_only", "action_retrospectives"],
  ["admin_operations_audit_service_insert", "admin_operations_audit"],
  ["admin_operations_audit_service_read_insert", "admin_operations_audit"],
  ["partner_annuaire_entries_service_only", "partner_annuaire_entries"],
  ["pedestrian_network_connections_service_role", "pedestrian_network_connections"],
  ["pedestrian_network_diagnostics_service_role", "pedestrian_network_diagnostics"],
  ["pedestrian_network_edges_service_role", "pedestrian_network_edges"],
  ["pedestrian_network_nodes_service_role", "pedestrian_network_nodes"],
  ["pedestrian_network_versions_service_role", "pedestrian_network_versions"],
  ["pedestrian_observation_cache_versions_service_role", "pedestrian_observation_cache_versions"],
  ["pedestrian_risk_cache_invalidation_events_service_role", "pedestrian_risk_cache_invalidation_events"],
  ["pedestrian_risk_projection_versions_service_role", "pedestrian_risk_projection_versions"],
  ["pedestrian_segment_observation_cache_service_role", "pedestrian_segment_observation_cache"],
  ["pedestrian_segment_risk_projections_service_role", "pedestrian_segment_risk_projections"],
  ["public_impact_action_butt_projections_service_only", "public_impact_action_cigarette_butt_projections"],
  ["report_generation_pdf_artifacts_service_only", "report_generation_pdf_artifacts"],
  ["report_generation_pdf_shares_service_only", "report_generation_pdf_shares"],
  ["spogomi_event_route_revisions_service_write", "spogomi_event_route_revisions"],
  ["spogomi_volunteer_help_proposal_events_service_only", "spogomi_volunteer_help_proposal_events"],
  ["spogomi_volunteer_help_proposals_service_only", "spogomi_volunteer_help_proposals"],
  ["territorial_legend_award_proofs_service_only", "territorial_legend_award_proofs"],
  ["territorial_legend_hold_periods_service_only", "territorial_legend_hold_periods"],
] as const;

describe("Supabase advisor hardening migration", () => {
  it("wraps exactly the 22 direct auth.role() policies", () => {
    expect(migration.match(/alter policy/g)).toHaveLength(22);
    expect(migration).not.toMatch(/auth\.role\(\)\s*=\s*'service_role'/);

    for (const [policy, table] of directRolePolicies) {
      expect(migration).toContain(`alter policy ${policy}`);
      expect(migration).toContain(`on public.${table}`);
      expect(migration).toContain("(select auth.role()) = 'service_role'");
    }
  });

  it("scopes route-revision service policy without changing grants", () => {
    const routePolicyStart = migration.indexOf(
      "alter policy spogomi_event_route_revisions_service_write",
    );
    const routePolicy = migration.slice(routePolicyStart, routePolicyStart + 320);
    expect(migration).toMatch(
      /alter policy spogomi_event_route_revisions_service_write[\s\S]*?to service_role[\s\S]*?using \(\(select auth\.role\(\)\) = 'service_role'\)[\s\S]*?with check \(\(select auth\.role\(\)\) = 'service_role'\)/,
    );
    expect(routePolicy).not.toMatch(/grant|revoke/);
  });

  it("closes direct trigger execution and makes the pure predicate invoker", () => {
    expect(migration).toContain(
      "revoke all on function public.enqueue_cleaning_action_observation_invalidation()",
    );
    expect(migration).toContain(
      "revoke all on function public.enqueue_trash_spotter_observation_invalidation()",
    );
    expect(migration).toMatch(
      /alter function public\.is_current_public_action_statistical_eligible\([\s\S]*?\) security invoker;/,
    );
    expect(migration).toMatch(
      /revoke all on function public\.action_pollution_score_references_v2\(\)[\s\S]*?grant execute on function public\.action_pollution_score_references_v2\(\)\s+to anon, authenticated, service_role;/,
    );
  });

  it("does not rewrite the six already wrapped auth.jwt() policies or projection bodies", () => {
    const sqlBody = migration.replace(/^\s*--.*$/gm, "");
    expect(sqlBody).not.toMatch(/auth\.jwt\(\)/);
    expect(sqlBody).not.toMatch(/create\s+(or replace\s+)?function/);
    expect(sqlBody).not.toMatch(/drop\s+function/);
  });
});
