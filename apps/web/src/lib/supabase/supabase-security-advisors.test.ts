import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_SERVER_ONLY_RLS_INFO_TABLES,
  findRlsContractFindings,
  parseSecurityAdvisorOutput,
  SECURITY_ADVISOR_COMMAND_OPTIONS,
} from "../../../scripts/supabase-security-advisors.mjs";

const expectedServerOnlyRlsInfoTables = [
  "action_conversation_exclusions",
  "action_share_contact_requests",
  "legal_content_reports",
  "legal_content_report_decisions",
  "user_points",
  "points_ledger",
  "user_badge_totals",
  "badge_events",
];

const serverOnlyContractSources = [
  {
    table: "action_conversation_exclusions",
    files: ["supabase/migrations/20260915000006_action_conversation_exclusions.sql"],
    required: [
      "alter table public.action_conversation_exclusions enable row level security",
      "revoke all on table public.action_conversation_exclusions from anon, authenticated",
      "grant all on table public.action_conversation_exclusions to service_role",
    ],
  },
  {
    table: "action_share_contact_requests",
    files: ["supabase/migrations/20260915000009_action_share_requests.sql"],
    required: [
      "alter table public.action_share_contact_requests enable row level security",
      "revoke all on table public.action_share_contact_requests from public, anon, authenticated",
      "grant all on table public.action_share_contact_requests to service_role",
    ],
  },
  {
    table: "legal_content_reports",
    files: ["supabase/migrations/20260827140000_legal_content_reports.sql"],
    required: [
      "alter table public.legal_content_reports enable row level security",
      "revoke all privileges on table public.legal_content_reports from anon, authenticated",
      "grant select, insert, update, delete on table public.legal_content_reports to service_role",
    ],
  },
  {
    table: "legal_content_report_decisions",
    files: ["supabase/migrations/20260827150000_legal_content_report_decisions.sql"],
    required: [
      "alter table public.legal_content_report_decisions enable row level security",
      "revoke all privileges on table public.legal_content_report_decisions from anon, authenticated",
      "grant select, insert, update, delete on table public.legal_content_report_decisions to service_role",
    ],
  },
  {
    table: "user_points",
    files: [
      "supabase/migrations/20260920000000_harden_gamification_projection_writes.sql",
      "supabase/migrations/20260925000000_revoke_gamification_projection_grants.sql",
    ],
    required: [
      "alter table public.user_points enable row level security",
      "revoke all on table public.user_points from public, anon, authenticated",
    ],
  },
  {
    table: "points_ledger",
    files: [
      "supabase/migrations/20260920000000_harden_gamification_projection_writes.sql",
      "supabase/migrations/20260925000000_revoke_gamification_projection_grants.sql",
    ],
    required: [
      "alter table public.points_ledger enable row level security",
      "revoke all on table public.points_ledger from public, anon, authenticated",
    ],
  },
  {
    table: "user_badge_totals",
    files: [
      "supabase/migrations/20260920000000_harden_gamification_projection_writes.sql",
      "supabase/migrations/20260925000000_revoke_gamification_projection_grants.sql",
    ],
    required: [
      "alter table public.user_badge_totals enable row level security",
      "revoke all on table public.user_badge_totals from public, anon, authenticated",
    ],
  },
  {
    table: "badge_events",
    files: [
      "supabase/migrations/20260920000000_harden_gamification_projection_writes.sql",
      "supabase/migrations/20260925000000_revoke_gamification_projection_grants.sql",
    ],
    required: [
      "alter table public.badge_events enable row level security",
      "revoke all on table public.badge_events from public, anon, authenticated",
    ],
  },
];

describe("Supabase security advisor guard", () => {
  it("uses only the explicitly linked project in the CURRENT workflow", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/supabase-security-advisors.mjs"),
      "utf8",
    );

    expect(script).toContain('["db", "advisors", "--linked"');
    expect(script).not.toContain("runLocalAdvisors");
    expect(script).not.toContain('["status"');
    expect(script).not.toContain('["start"');
    expect(script).not.toContain('["db", "reset"');
    expect(script).not.toContain("Docker Desktop");
  });

  it("allows only the eight documented server-only INFO findings", () => {
    expect(ALLOWED_SERVER_ONLY_RLS_INFO_TABLES).toEqual(expectedServerOnlyRlsInfoTables);
    expect(SECURITY_ADVISOR_COMMAND_OPTIONS).toEqual([
      "--type",
      "security",
      "--level",
      "info",
      "--fail-on",
      "none",
      "--output-format",
      "json",
    ]);

    const allowedFindings = [
      {
        name: "rls_enabled_no_policy",
        level: "INFO",
        detail:
          "Table `public.action_conversation_exclusions` has RLS enabled, but no policies exist",
        metadata: { name: "action_conversation_exclusions", type: "table" },
      },
      {
        name: "rls_enabled_no_policy",
        level: "INFO",
        detail:
          "Table `public.action_share_contact_requests` has RLS enabled, but no policies exist",
        metadata: { name: "action_share_contact_requests", type: "table" },
      },
      {
        name: "rls_enabled_no_policy",
        level: "INFO",
        detail: "Table `public.legal_content_reports` has RLS enabled, but no policies exist",
        metadata: { name: "legal_content_reports", type: "table" },
      },
      {
        name: "rls_enabled_no_policy",
        level: "INFO",
        detail:
          "Table `public.legal_content_report_decisions` has RLS enabled, but no policies exist",
        metadata: { name: "legal_content_report_decisions", type: "table" },
      },
      {
        name: "rls_enabled_no_policy",
        level: "INFO",
        detail: "Table `public.user_points` has RLS enabled, but no policies exist",
        metadata: { name: "user_points", type: "table" },
      },
      {
        name: "rls_enabled_no_policy",
        level: "INFO",
        detail: "Table `public.points_ledger` has RLS enabled, but no policies exist",
        metadata: { name: "points_ledger", type: "table" },
      },
      {
        name: "rls_enabled_no_policy",
        level: "INFO",
        detail:
          "Table `public.user_badge_totals` has RLS enabled, but no policies exist",
        metadata: { name: "user_badge_totals", type: "table" },
      },
      {
        name: "rls_enabled_no_policy",
        level: "INFO",
        detail: "Table `public.badge_events` has RLS enabled, but no policies exist",
        metadata: { name: "badge_events", type: "table" },
      },
    ];

    expect(
      findRlsContractFindings(JSON.stringify(allowedFindings)),
    ).toEqual([]);

    const cliEscapedAllowedFindings = allowedFindings.map((finding) => ({
      ...finding,
      detail: finding.detail.replaceAll("`", "\\`"),
    }));

    expect(
      findRlsContractFindings(JSON.stringify(cliEscapedAllowedFindings)),
    ).toEqual([]);

    expect(
      findRlsContractFindings(
        JSON.stringify([
          ...allowedFindings,
          {
            name: "rls_enabled_no_policy",
            level: "INFO",
            detail: "Table `public.other_table` has RLS enabled, but no policies exist",
            metadata: { name: "other_table", type: "table" },
          },
        ]),
      ),
    ).toEqual([
      {
        name: "rls_enabled_no_policy",
        level: "INFO",
        detail: "Table `public.other_table` has RLS enabled, but no policies exist",
        metadata: { name: "other_table", type: "table" },
      },
    ]);
  });

  it("keeps every accepted INFO table server-only without adding a permissive policy", () => {
    expect(serverOnlyContractSources.map(({ table }) => table)).toEqual(
      expectedServerOnlyRlsInfoTables,
    );

    for (const contract of serverOnlyContractSources) {
      const source = contract.files
        .map((relativePath) => readFileSync(resolve(process.cwd(), relativePath), "utf8"))
        .join("\n");

      for (const required of contract.required) {
        expect(source, `${contract.table}: ${required}`).toContain(required);
      }

      expect(source).not.toMatch(
        new RegExp(`create\\s+policy[\\s\\S]{0,240}on\\s+public\\.${contract.table}\\b`, "i"),
      );
    }
  });

  it("keeps the allowlist fail-closed for severity, table, and payload changes", () => {
    const base = {
      name: "rls_enabled_no_policy",
      detail: "Table `public.legal_content_reports` has RLS enabled, but no policies exist",
      metadata: { name: "legal_content_reports", type: "table" },
    };

    for (const finding of [
      { ...base, level: "WARN" },
      { ...base, level: "ERROR" },
      { ...base, metadata: { name: "other_table", type: "table" } },
      { ...base, metadata: { name: "legal_content_reports", type: "view" } },
      { ...base, detail: "Table `private.legal_content_reports` has RLS enabled, but no policies exist" },
    ]) {
      expect(findRlsContractFindings(JSON.stringify([finding]))).toEqual([finding]);
    }
  });

  it("fails closed on each known RLS contract violation and renamed equivalents", () => {
    const findings = findRlsContractFindings(
      JSON.stringify({
        findings: [
          { name: "rls_disabled_in_public" },
          { name: "policy_exists_rls_disabled" },
          { name: "RLS policy disabled on public.forms" },
          { name: "authenticated_security_definer_function_executable" },
        ],
      }),
    );

    expect(findings.map((finding) => finding.name)).toEqual([
      "rls_disabled_in_public",
      "policy_exists_rls_disabled",
      "RLS policy disabled on public.forms",
    ]);
  });

  it("does not turn unrelated INFO findings into RLS failures", () => {
    expect(
      findRlsContractFindings(
        JSON.stringify({
          data: [
            { name: "extension_in_public", level: "INFO" },
            { name: "authenticated_security_definer_function_executable", level: "WARN" },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("fails closed when the CLI response is not JSON", () => {
    expect(() => parseSecurityAdvisorOutput("unexpected text")).toThrow(
      "did not return JSON",
    );
  });
});
