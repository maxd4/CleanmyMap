import { describe, expect, it } from "vitest";
import {
  findRlsContractFindings,
  parseSecurityAdvisorOutput,
  SECURITY_ADVISOR_COMMAND_OPTIONS,
} from "../../../scripts/supabase-security-advisors.mjs";

describe("Supabase security advisor guard", () => {
  it("loads INFO findings so RLS no-policy findings cannot be hidden", () => {
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

    expect(
      findRlsContractFindings(
        JSON.stringify([
          { name: "rls_enabled_no_policy", level: "INFO" },
          { name: "extension_in_public", level: "WARN" },
        ]),
      ),
    ).toHaveLength(1);
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
