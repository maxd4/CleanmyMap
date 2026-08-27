import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(new URL("../../app/api/legal-content-reports/route.ts", import.meta.url), "utf8");
const form = readFileSync(new URL("../../components/sections/rubriques/legal-content-report-form.tsx", import.meta.url), "utf8");
const legalSection = readFileSync(new URL("../../components/sections/rubriques/legal-section.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../../app/signaler-contenu-illicite/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../../supabase/migrations/20260827140000_legal_content_reports.sql", import.meta.url), "utf8");
const decisionsMigration = readFileSync(new URL("../../../supabase/migrations/20260827150000_legal_content_report_decisions.sql", import.meta.url), "utf8");
const decisionRoute = readFileSync(new URL("../../app/api/admin/legal-content-reports/decision/route.ts", import.meta.url), "utf8");

describe("legal content report public contracts", () => {
  it("keeps the public surface as a POST-only, protected submission", () => {
    expect(route).toContain("export async function POST");
    expect(route).not.toContain("export async function GET");
    expect(route).toContain("requireBotIdHuman");
    expect(route).toContain("verifyRateLimit");
    expect(route).toContain("hasHoneypotSignal");
    expect(route).toContain("appendLegalContentReport");
    expect(route).toContain("sendLegalContentReportAcknowledgement");
    expect(route).toContain("sendLegalContentReportCreatorNotification");
  });

  it("keeps the required form fields and the identity exception explicit", () => {
    expect(form).toContain('name="contentUrl"');
    expect(form).toContain('name="allegationReason"');
    expect(form).toContain('name="goodFaithConfirmed"');
    expect(form).toMatch(/articles\s+3 à 7 de la directive\s+2011\/93\/UE/);
    expect(page).toContain("Aucun compte n&apos;est nécessaire");
    expect(form).not.toContain("type=\"file\"");
  });

  it("links the legal section to the dedicated page without the fake abuse button", () => {
    expect(legalSection).toContain('href="/signaler-contenu-illicite"');
    expect(legalSection).not.toContain("CmmButton");
    expect(legalSection).not.toContain("Signaler un abus");
  });

  it("keeps both migrations server-only without deprecated auth.role policies", () => {
    expect(migration).toContain("revoke all privileges on table public.legal_content_reports from anon, authenticated");
    expect(migration).toContain("revoke all privileges on table public.legal_content_reports from service_role");
    expect(migration).toContain("grant select, insert, update, delete on table public.legal_content_reports to service_role");
    expect(migration).toContain("alter table public.legal_content_reports enable row level security");
    expect(migration).toContain("drop policy if exists legal_content_reports_service_only");
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("create policy legal_content_reports_service_only");

    expect(decisionsMigration).toContain("revoke all privileges on table public.legal_content_report_decisions from anon, authenticated");
    expect(decisionsMigration).toContain("revoke all privileges on table public.legal_content_report_decisions from service_role");
    expect(decisionsMigration).toContain("grant select, insert, update, delete on table public.legal_content_report_decisions to service_role");
    expect(decisionsMigration).toContain("alter table public.legal_content_report_decisions enable row level security");
    expect(decisionsMigration).toContain("drop policy if exists legal_content_report_decisions_service_only");
    expect(decisionsMigration).not.toContain("auth.role()");
    expect(decisionsMigration).not.toContain("create policy legal_content_report_decisions_service_only");
  });

  it("keeps administrative decisions separated, bounded and auditable", () => {
    expect(decisionRoute).toContain("requireAdminAccess");
    expect(decisionRoute).toContain("legalBasis");
    expect(decisionRoute).toContain("termsBasis");
    expect(decisionRoute).toContain("executionStatus");
    expect(decisionRoute).toContain("executionErrorCode");
    expect(decisionRoute).toContain('executionStatus === "applied"');
    expect(decisionRoute).toContain('status: \"partial\"');
    expect(decisionsMigration).toContain("legal_content_report_decisions");
    expect(decisionsMigration).toContain("actor_admin_user_id");
    expect(decisionsMigration).toContain("automated_means_used");
    expect(decisionsMigration).toContain("before_state");
    expect(decisionsMigration).toContain("after_state");
    expect(decisionsMigration).toContain("execution_status");
    expect(decisionsMigration).toContain("execution_error_code");
    expect(decisionsMigration).toContain("legal_content_report_decisions_execution_consistency_check");
    expect(decisionsMigration).toContain("content_not_found");
    expect(decisionsMigration).toContain("legal_content_report_decisions_service_only");
    expect(decisionsMigration).toContain("char_length(reason) between 5 and 2000");
    expect(decisionsMigration).toContain("octet_length(before_state::text) <= 4000");
  });
});
