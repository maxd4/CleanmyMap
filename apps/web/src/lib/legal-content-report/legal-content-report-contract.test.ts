import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(new URL("../../app/api/legal-content-reports/route.ts", import.meta.url), "utf8");
const form = readFileSync(new URL("../../components/sections/rubriques/legal-content-report-form.tsx", import.meta.url), "utf8");
const legalSection = readFileSync(new URL("../../components/sections/rubriques/legal-section.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../../app/signaler-contenu-illicite/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../../supabase/migrations/20260827140000_legal_content_reports.sql", import.meta.url), "utf8");

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

  it("keeps the migration service-only and without public table privileges", () => {
    expect(migration).toContain("revoke all privileges on table public.legal_content_reports from anon, authenticated");
    expect(migration).toContain("alter table public.legal_content_reports enable row level security");
    expect(migration).toContain("with check ((select auth.role()) = 'service_role')");
  });
});
