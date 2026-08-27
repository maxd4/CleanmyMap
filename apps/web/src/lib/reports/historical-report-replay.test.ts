import { describe, expect, it, vi } from "vitest";
import { replayHistoricalReport } from "./historical-report-replay";

const snapshot = {
  title: "Rapport historique",
  rubrique: "reporting",
  periode: "six_months",
  organizationType: "Global",
  data: {
    generatedAt: "2026-08-27T10:30:00.000Z",
    summary: ["Valeur historique"],
  },
};
const generation = {
  id: "11111111-1111-4111-8111-111111111111",
  filename: "rapport_historique.pdf",
  generatedAt: snapshot.data.generatedAt,
  scopeLabel: "Global",
  detailLevel: "default" as const,
  snapshot,
};

describe("historical report replay", () => {
  it("passes the stored snapshot unchanged to Voir", () => {
    const view = vi.fn();
    const reexport = vi.fn();

    replayHistoricalReport("view", generation, { view, reexport });

    expect(view).toHaveBeenCalledWith(snapshot);
    expect(reexport).not.toHaveBeenCalled();
    expect(snapshot.data.generatedAt).toBe("2026-08-27T10:30:00.000Z");
  });

  it("passes the stored snapshot and filename unchanged to Réexporter", () => {
    const view = vi.fn();
    const reexport = vi.fn();

    replayHistoricalReport("reexport", generation, { view, reexport });

    expect(reexport).toHaveBeenCalledWith(snapshot, generation.filename);
    expect(view).not.toHaveBeenCalled();
  });
});
