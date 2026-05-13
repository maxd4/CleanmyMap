import { describe, expect, it } from "vitest";
import { buildDeliverableHeaders } from "./http";

describe("deliverable http headers", () => {
  it("builds coherent export headers", () => {
    const { filename, headers } = buildDeliverableHeaders({
      rubrique: "reports elus dossier",
      extension: "pdf",
      contentType: "application/pdf",
      date: new Date("2026-05-13T10:00:00.000Z"),
      extra: { "X-Export-Warning": "Dataset truncated to limit" },
    });

    expect(filename).toBe("reports_elus_dossier_cmm_13-05-2026.pdf");
    expect(headers["Content-Disposition"]).toBe(
      'attachment; filename="reports_elus_dossier_cmm_13-05-2026.pdf"',
    );
    expect(headers["X-Deliverable-Name"]).toBe(filename);
    expect(headers["X-Deliverable-Format"]).toBe("pdf");
    expect(headers["X-Export-Warning"]).toBe("Dataset truncated to limit");
  });
});
