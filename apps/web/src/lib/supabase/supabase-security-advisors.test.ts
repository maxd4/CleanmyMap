import { describe, expect, it } from "vitest";
import {
  findRlsContractFindings,
  parseSecurityAdvisorOutput,
  SECURITY_ADVISOR_COMMAND_OPTIONS,
} from "../../../scripts/supabase-security-advisors.mjs";

describe("Supabase security advisor guard", () => {
  it("allows only the two documented server-only INFO findings", () => {
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
    ];

    expect(
      findRlsContractFindings(JSON.stringify(allowedFindings)),
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
