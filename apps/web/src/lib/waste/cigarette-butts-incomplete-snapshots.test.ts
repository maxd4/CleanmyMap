import { describe, expect, it } from "vitest";
import {
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
  aggregateCigaretteButtsLots,
  projectCurrentCigaretteButts,
} from "./cigarette-butts";

function historicalVolumeSnapshot() {
  return aggregateCigaretteButtsLots([
    { id: "historical-volume", source: "volume_l", value: 1, condition: "propre" },
  ], { volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1 });
}

function project(snapshot: ReturnType<typeof historicalVolumeSnapshot>, results = snapshot.results) {
  return projectCurrentCigaretteButts({
    cigaretteButtsCount: snapshot.summary.totalCount,
    cigaretteButtsCountProvenance: "estimated",
    cigaretteButtsLots: snapshot.lots,
    cigaretteButtsLotResults: results,
  }, snapshot.summary.totalCount);
}

describe("incomplete historical cigarette-butt snapshots", () => {
  it("preserves the historical count when results are empty", () => {
    const snapshot = historicalVolumeSnapshot();
    const projection = project(snapshot, []);

    expect(projection).toMatchObject({
      count: 600,
      results: null,
      status: "not_recalculable",
      source: "historical",
      volumeConversionVersion: null,
    });
  });

  it("preserves the historical count when results are partial", () => {
    const first = aggregateCigaretteButtsLots([
      { id: "first", source: "volume_l", value: 1, condition: "propre" },
      { id: "second", source: "volume_l", value: 1, condition: "propre" },
    ], { volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1 });
    const projection = project({ ...first, summary: { ...first.summary, totalCount: 1_200 } }, [first.results[0]!]);

    expect(projection.count).toBe(1_200);
    expect(projection.status).toBe("not_recalculable");
    expect(projection.volumeConversionVersion).toBeNull();
  });

  it("preserves the historical count when a result no longer matches its lot", () => {
    const snapshot = historicalVolumeSnapshot();
    const incompatible = [{ ...snapshot.results[0]!, value: 2 }];
    const projection = project(snapshot, incompatible);

    expect(projection).toMatchObject({ count: 600, status: "not_recalculable", source: "historical" });
    expect(projection.results?.[0]?.count).toBe(600);
  });

  it("recalculates complete recognized v1 and v2 snapshots only", () => {
    const historical = historicalVolumeSnapshot();
    const current = aggregateCigaretteButtsLots(historical.lots);

    expect(project(historical)).toMatchObject({
      count: 700,
      status: "recalculable",
      volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
    });
    expect(project(current)).toMatchObject({
      count: 700,
      status: "recalculable",
      volumeConversionVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION,
    });
  });
});
