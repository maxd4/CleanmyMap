import { describe, expect, it } from "vitest";
import { readMigration } from "./read-migration";

const profileMigration = readMigration(
  import.meta.url,
  "20261015000019_profile_security_advisory_fix.sql",
);
const spogomiMigration = readMigration(
  import.meta.url,
  "20261015000020_spogomi_rls_advisory_fix.sql",
);

const servicePolicies = [
  ["spogomi_identity_assistance_requests_service_only", "spogomi_identity_assistance_requests"],
  ["spogomi_identity_assistance_request_events_service_only", "spogomi_identity_assistance_request_events"],
  ["spogomi_identity_assistance_invitations_service_only", "spogomi_identity_assistance_invitations"],
  ["spogomi_team_join_requests_service_only", "spogomi_team_join_requests"],
  ["spogomi_team_join_request_events_service_only", "spogomi_team_join_request_events"],
  ["spogomi_events_service_write", "spogomi_events"],
  ["spogomi_teams_service_write", "spogomi_teams"],
  ["spogomi_result_items_service_write", "spogomi_result_items"],
  ["spogomi_event_routes_service_write", "spogomi_event_routes"],
  ["spogomi_team_access_grants_service_only", "spogomi_team_access_grants"],
  ["spogomi_team_access_sessions_service_only", "spogomi_team_access_sessions"],
  ["spogomi_result_audit_events_service_append", "spogomi_result_audit_events"],
  ["spogomi_participants_service_only", "spogomi_participants"],
  ["spogomi_category_rules_service_write", "spogomi_category_rules"],
  ["spogomi_result_submissions_service_write", "spogomi_result_submissions"],
  ["spogomi_result_reviews_service_append", "spogomi_result_reviews"],
  ["spogomi_event_reviewers_service_only", "spogomi_event_reviewers"],
  ["spogomi_divisions_service_write", "spogomi_divisions"],
] as const;

describe("profile and SPOGOMI Supabase advisor migrations", () => {
  it("keeps the public profile projection bounded and moves privileged lookup behind private", () => {
    expect(profileMigration).toContain(
      "alter view public.public_profiles set (security_barrier = true, security_invoker = true);",
    );
    expect(profileMigration).toContain(
      "create or replace function private.current_profile_arrondissement()",
    );
    expect(profileMigration).toContain("security definer");
    expect(profileMigration).toContain(
      "create or replace function public.current_profile_arrondissement()",
    );
    expect(profileMigration).toContain("security invoker");
    expect(profileMigration).toContain(
      "grant execute on function private.current_profile_arrondissement() to authenticated, service_role;",
    );
    expect(profileMigration).toContain("grant usage on schema private to service_role;");
    expect(profileMigration).toContain(
      "grant execute on function public.current_profile_arrondissement() to authenticated, service_role;",
    );
    expect(profileMigration).not.toMatch(
      /create\s+or\s+replace\s+function\s+public\.current_profile_arrondissement\(\)[\s\S]*?security\s+definer/i,
    );
  });

  it("wraps exactly the 18 flagged SPOGOMI policies and scopes them to service_role", () => {
    expect(spogomiMigration.match(/alter policy [a-z0-9_]+\s+on/g)).toHaveLength(servicePolicies.length);
    for (const [policyName, tableName] of servicePolicies) {
      expect(spogomiMigration).toContain(
        `alter policy ${policyName} on public.${tableName} to service_role`,
      );
    }
    expect(spogomiMigration.match(/\(select auth\.role\(\)\)/g)).toHaveLength(34);
    expect(spogomiMigration).not.toMatch(/auth\.role\(\)\s*=\s*'service_role'/);
    expect(spogomiMigration).not.toMatch(/\b(create|drop)\s+policy/i);
    expect(spogomiMigration).not.toMatch(/\b(grant|revoke)\b/i);
  });
});
