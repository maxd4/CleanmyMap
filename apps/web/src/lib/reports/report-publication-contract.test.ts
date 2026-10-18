import { describe, expect, it } from "vitest";
import {
  assertReportPublicationEligibility,
  projectReportPublicationRow,
  projectReportPublicationPreview,
  ReportPublicationProjectionError,
} from "./report-publication-contract";

const generation = {
  id: "11111111-1111-4111-8111-111111111111",
  filename: "rapport.pdf",
  generatedAt: "2026-10-18T10:00:00.000Z",
  scopeKind: "global" as const,
  scopeValue: "",
  scopeLabel: "Toutes les actions",
  detailLevel: "default" as const,
  theme: "scientific" as const,
  snapshot: {
    title: "Rapport scientifique communautaire",
    rubrique: "reporting",
    periode: "six_months",
    organizationType: "Global",
    data: { generatedAt: "2026-10-18T10:00:00.000Z", summary: ["Résumé agrégé"] },
  },
};

describe("report publication projection", () => {
  it("keeps the public projection free of generation and artifact identifiers", () => {
    const row = projectReportPublicationRow({
      id: "22222222-2222-4222-8222-222222222222",
      generationId: generation.id,
      artifactId: "33333333-3333-4333-8333-333333333333",
      createdByClerkId: "owner-private",
      title: generation.snapshot.title,
      periodId: "six_months",
      scopeLabel: generation.scopeLabel,
      theme: "scientific",
      publishedAt: "2026-10-18T11:00:00.000Z",
      revokedAt: null,
      publicAuthorLabel: null,
    });

    expect(row).toMatchObject({ title: generation.snapshot.title, period: "Six mois", theme: "scientific" });
    expect(JSON.stringify(row)).not.toContain(generation.id);
    expect(JSON.stringify(row)).not.toContain("owner-private");
    expect(JSON.stringify(row)).not.toContain("33333333");
  });

  it("requires the actually accessible PDF artifact for a confirmation preview", () => {
    expect(projectReportPublicationPreview({ generation, theme: "scientific", artifactReady: true })).toMatchObject({
      artifactReady: true,
      documentUrl: expect.stringContaining("/api/reports/generations/"),
      authorLabel: null,
    });
  });

  it.each([
    [{ ...generation, scopeKind: "single_action" as const }, "mono-action"],
    [{ ...generation, snapshot: { ...generation.snapshot, organizationName: "Association privée" } }, "organization"],
    [{ ...generation, snapshot: { ...generation.snapshot, data: { ...generation.snapshot.data, rows: [{ email: "private@example.com" }] } } }, "private rows"],
  ])("rejects unsafe publication projection (%s)", (...args: unknown[]) => {
    expect(() => assertReportPublicationEligibility(args[0] as typeof generation)).toThrow(ReportPublicationProjectionError);
  });
});
