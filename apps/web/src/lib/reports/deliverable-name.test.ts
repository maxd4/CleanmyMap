import { describe, expect, it } from "vitest";
import {
  buildDeliverableBaseName,
  buildDeliverableFilename,
  formatDeliverableDate,
  normalizeDeliverableRubrique,
} from "./deliverable-name";

describe("deliverable naming", () => {
  it("normalizes rubrique in lowercase underscore format", () => {
    expect(normalizeDeliverableRubrique("Reports / Audit 2026")).toBe(
      "reports_audit_2026",
    );
    expect(normalizeDeliverableRubrique("Élu – Dossier")).toBe("elu_dossier");
  });

  it("formats date as dd-mm-yyyy", () => {
    expect(formatDeliverableDate(new Date("2026-04-10T08:00:00.000Z"))).toBe(
      "10-04-2026",
    );
  });

  it("builds base name with convention rubrique_cmm_date", () => {
    expect(
      buildDeliverableBaseName({
        rubrique: "reports",
        date: new Date("2026-04-10T08:00:00.000Z"),
      }),
    ).toBe("reports_cmm_10-04-2026");
  });

  it("builds filename with extension", () => {
    expect(
      buildDeliverableFilename({
        rubrique: "analytics funnel",
        extension: "csv",
        date: new Date("2026-04-10T08:00:00.000Z"),
      }),
    ).toBe("analytics_funnel_cmm_10-04-2026.csv");
  });
});
