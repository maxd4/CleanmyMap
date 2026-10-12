import { describe, expect, it } from "vitest";
import { buildPdfReportLines, buildSimplePdf } from "@/lib/pdf-export/simple-pdf";

describe("SPOGOMI volunteer certificate PDF contract", () => {
  it("contains the faithful private certificate fields in a real PDF byte stream", () => {
    const lines = buildPdfReportLines({
      title: "Attestation de participation bénévole — CleanMyMap / SPOGOMI",
      rubrique: "SPOGOMI", periode: "2026-06-01", organizationType: "CleanMyMap / SPOGOMI", organizationName: "CleanMyMap",
      data: { summary: ["Identité : Ada Lovelace", "Événement officiel : SPOGOMI Paris", "Mission(s) bénévole(s) certifiée(s) : Sécurité terrain · certification v1", "Référence unique : SPOGOMI-ABC123"], generatedAt: "2026-06-01T12:00:00.000Z" },
    });
    const pdf = buildSimplePdf(lines);
    const text = new TextDecoder().decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Attestation de participation");
    expect(text).toContain("SPOGOMI Paris");
    expect(text).toContain("SPOGOMI-ABC123");
    expect(text).not.toContain("heures");
  });
});
