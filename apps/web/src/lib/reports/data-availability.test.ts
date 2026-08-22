import { describe, expect, it } from "vitest";
import { buildReportDataAvailabilityNotices } from "./data-availability";

describe("report data availability notices", () => {
  it("distinguishes an empty available dataset from an unavailable source", () => {
    expect(
      buildReportDataAvailabilityNotices({
        isTruncated: false,
        sourceHealth: {
          partial: false,
          failedSources: [],
          availableSources: ["actions"],
          warnings: [],
        },
        communityEventsAvailability: "available",
      }),
    ).toEqual([]);

    expect(
      buildReportDataAvailabilityNotices({
        communityEventsAvailability: "unavailable",
      }),
    ).toEqual([
      "Les événements communautaires sont indisponibles ; leur absence ne vaut pas zéro.",
    ]);
  });

  it("marks truncation and partial source health as non-exhaustive", () => {
    expect(
      buildReportDataAvailabilityNotices({
        isTruncated: true,
        sourceHealth: {
          partial: true,
          failedSources: ["spots"],
          availableSources: ["actions"],
          warnings: ["spots unavailable"],
        },
      }),
    ).toEqual([
      "Données potentiellement partielles : la limite de chargement a été atteinte.",
      "Certaines sources sont indisponibles : les indicateurs ne sont pas exhaustifs.",
    ]);
  });
});
