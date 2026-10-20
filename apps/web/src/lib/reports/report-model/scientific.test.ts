import { describe, expect, it } from "vitest";
import type { CommunityEventItem } from "@/lib/community/http";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import { buildActionDataContract } from "@/lib/actions/contracts/contract-model";
import {
  buildActionImpactMethodology,
  computeActionImpactKpis,
  sumActionImpactKpis,
} from "@/lib/actions/impact-calculators";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import {
  STREET_CLEANING_EUROS_PER_WASTE_KG,
  VOLUNTEER_ACTION_EUROS_PER_HOUR,
} from "@/lib/impact/impact-terrain-2026-constants";
import { computeReportModel } from "@/lib/reports/report-model/compute-report-model";
import {
  buildCalendarRows,
  buildMonthRows,
  buildRouteSteps,
} from "@/lib/reports/report-model/builders";
import { buildReportProjections } from "@/lib/reports/report-model/compute-report-model.projections";
import { buildExhaustiveSupplementalChapters } from "@/lib/reports/report-detail-level";
import { computeReportRsvpSummary } from "@/lib/reports/report-model/community";
import {
  toFrDate,
  toFrInt,
  toFrNumber,
  toFrOptionalInt,
  toFrOptionalNumber,
} from "@/lib/reports/report-model/formatters";
import { normalizeListType } from "@/lib/reports/report-model/helpers";
import { average, median } from "@/lib/reports/report-model/math";
import {
  computeCommunityEngagementMetrics,
  computeEnvironmentalProxyMetrics,
  computeMapCoverageMetrics,
} from "@/lib/reports/report-model/metrics";

type ActionOverrides = {
  id?: string;
  status?: "pending" | "approved" | "rejected";
  actionDate?: string;
  locationLabel?: string;
  latitude?: number | null;
  longitude?: number | null;
  wasteKg?: number | null;
  cigaretteButts?: number | null;
  volunteersCount?: number | null;
  durationMinutes?: number | null;
  actorName?: string | null;
  source?: string;
};

function makeAction(overrides: ActionOverrides = {}): ActionListItem {
  const id = overrides.id ?? "action-1";
  const status = overrides.status ?? "approved";
  const actionDate = overrides.actionDate ?? "2026-03-01";
  const locationLabel = overrides.locationLabel ?? "Paris 10e";
  const latitude = overrides.latitude === undefined ? 48.87 : overrides.latitude;
  const longitude = overrides.longitude === undefined ? 2.36 : overrides.longitude;
  const wasteKg = overrides.wasteKg === undefined ? 1 : overrides.wasteKg;
  const cigaretteButts = overrides.cigaretteButts === undefined ? 10 : overrides.cigaretteButts;
  const volunteersCount = overrides.volunteersCount === undefined ? 1 : overrides.volunteersCount;
  const durationMinutes = overrides.durationMinutes === undefined ? 30 : overrides.durationMinutes;
  const source = overrides.source ?? "web_form";
  const actorName = overrides.actorName ?? "Alice";
  const contract = buildActionDataContract({
    id,
    type: "action",
    status,
    source,
    observedAt: actionDate,
    createdAt: "2026-02-28T08:00:00.000Z",
    validatedAt: "2026-03-02T08:00:00.000Z",
    locationLabel,
    latitude,
    longitude,
    wasteKg,
    cigaretteButts,
    volunteersCount,
    durationMinutes,
    actorName,
  });

  return {
    id,
    created_at: "2026-02-28T08:00:00.000Z",
    actor_name: actorName,
    action_date: actionDate,
    location_label: locationLabel,
    latitude,
    longitude,
    waste_kg: wasteKg,
    cigarette_butts: cigaretteButts,
    volunteers_count: volunteersCount,
    duration_minutes: durationMinutes ?? 0,
    notes: null,
    status,
    record_type: "action",
    source,
    contract,
  } as ActionListItem;
}

function makeMapItem(
  action: ActionListItem,
  overrides: {
    geometryKind?: "point" | "polyline" | "polygon";
    latitude?: number | null;
    longitude?: number | null;
    locationLabel?: string;
  } = {},
): ActionMapItem {
  const latitude = overrides.latitude === undefined ? action.latitude : overrides.latitude;
  const longitude = overrides.longitude === undefined ? action.longitude : overrides.longitude;
  const locationLabel = overrides.locationLabel === undefined ? action.location_label : overrides.locationLabel;
  const contract = action.contract
    ? {
        ...action.contract,
        location: { ...action.contract.location, label: locationLabel, latitude, longitude },
        geometry: {
          ...action.contract.geometry,
          kind: overrides.geometryKind ?? action.contract.geometry.kind,
          coordinates:
            latitude !== null && longitude !== null ? [[latitude, longitude] as [number, number]] : [],
        },
      }
    : undefined;

  return {
    ...action,
    location_label: locationLabel,
    latitude,
    longitude,
    contract,
  } as ActionMapItem;
}

function makeEvent(
  rsvpCounts: { yes: number; maybe: number; no: number },
): CommunityEventItem {
  return { rsvpCounts } as CommunityEventItem;
}

describe("Reports scientific model", () => {
  it("calculates one-action KPIs from the configured factors and keeps units separate", () => {
    const impact = computeActionImpactKpis({
      metadata: {
        wasteKg: 12.5,
        cigaretteButts: 3,
        volunteersCount: 4,
        durationMinutes: 90,
      },
    });
    const factors = IMPACT_PROXY_CONFIG.factors;
    const actionHours = 90 / 60;
    const massEstimate = 12.5 * STREET_CLEANING_EUROS_PER_WASTE_KG;
    const timeEstimate = actionHours * VOLUNTEER_ACTION_EUROS_PER_HOUR;

    expect(impact).toMatchObject({
      wasteKg: 12.5,
      wasteKnown: true,
      wasteKgSource: "declared",
      butts: 3,
      buttsKnown: true,
      volunteers: 4,
      volunteersKnown: true,
      co2AvoidedKg: 12.5 * factors.co2KgPerWasteKg,
      waterSavedLiters: Math.round(3 * factors.waterLitersPerCigaretteButt),
      euroSaved: Math.round(massEstimate),
    });
    expect(impact.streetCleaningSavings).toEqual({
      wasteKg: 12.5,
      durationMinutes: 90,
      actionHours,
      massEstimateEuros: massEstimate,
      timeEstimateEuros: timeEstimate,
      lowerBoundEuros: Math.min(massEstimate, timeEstimate),
      upperBoundEuros: Math.max(massEstimate, timeEstimate),
    });
  });

  it("aggregates heterogeneous availability with an independent oracle", () => {
    const contracts = [
      { metadata: { wasteKg: 2.5, cigaretteButts: 10, volunteersCount: 2, durationMinutes: 30 } },
      { metadata: { wasteKg: null, cigaretteButts: null, volunteersCount: null, durationMinutes: 60 } },
      { metadata: { wasteKg: 0, cigaretteButts: 0, volunteersCount: 0, durationMinutes: 15 } },
      { metadata: { wasteKg: -1, cigaretteButts: -3, volunteersCount: -2, durationMinutes: Number.NaN } },
    ];
    const expectedWaste = 2.5 + 0;
    const expectedButts = 10 + 0;
    const expectedVolunteers = 2 + 0;
    const expectedDurationMinutes = 30 + 60 + 15;
    const totals = sumActionImpactKpis(contracts);

    expect(totals).toMatchObject({
      wasteKg: expectedWaste,
      wasteKnown: true,
      wasteKnownActions: 2,
      wasteActionCount: 4,
      wasteCoverageRate: 50,
      butts: expectedButts,
      buttsKnown: true,
      buttsKnownActions: 2,
      buttsActionCount: 4,
      buttsCoverageRate: 50,
      volunteers: expectedVolunteers,
      volunteersKnown: true,
      volunteersKnownActions: 2,
      volunteersActionCount: 4,
      volunteersCoverageRate: 50,
      co2AvoidedKg: expectedWaste * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg,
      waterSavedLiters: Math.round(expectedButts * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt),
    });
    expect(totals.streetCleaningSavings).toEqual({
      wasteKg: expectedWaste,
      durationMinutes: expectedDurationMinutes,
      actionHours: expectedDurationMinutes / 60,
      massEstimateEuros: expectedWaste * STREET_CLEANING_EUROS_PER_WASTE_KG,
      timeEstimateEuros: (expectedDurationMinutes / 60) * VOLUNTEER_ACTION_EUROS_PER_HOUR,
      lowerBoundEuros: Math.min(
        expectedWaste * STREET_CLEANING_EUROS_PER_WASTE_KG,
        (expectedDurationMinutes / 60) * VOLUNTEER_ACTION_EUROS_PER_HOUR,
      ),
      upperBoundEuros: Math.max(
        expectedWaste * STREET_CLEANING_EUROS_PER_WASTE_KG,
        (expectedDurationMinutes / 60) * VOLUNTEER_ACTION_EUROS_PER_HOUR,
      ),
    });
  });

  it("keeps null, explicit zero and derived proxy results distinguishable in the public model", () => {
    const measured = makeAction({ id: "measured", wasteKg: 2.5, cigaretteButts: 10, volunteersCount: 2 });
    const missing = makeAction({
      id: "missing",
      actionDate: "2026-03-02",
      wasteKg: null,
      cigaretteButts: null,
      volunteersCount: null,
    });
    const zero = makeAction({
      id: "zero",
      actionDate: "2026-03-03",
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 0,
      durationMinutes: 0,
    });
    const report = computeReportModel({
      allItems: [measured, missing, zero],
      approvedItems: [measured, missing, zero],
      mapItems: [
        makeMapItem(measured, { locationLabel: "Mesurée", latitude: 48.85, longitude: 2.35 }),
        makeMapItem(missing, { locationLabel: "Inconnue", latitude: 48.86, longitude: 2.36 }),
        makeMapItem(zero, { locationLabel: "Zéro explicite", latitude: 48.87, longitude: 2.37 }),
      ],
      events: [],
      now: new Date("2026-03-25T12:00:00.000Z"),
    });

    expect(report.totals).toMatchObject({
      actions: 3,
      kg: 2.5,
      knownWasteActions: 2,
      butts: 10,
      buttsKnownActions: 2,
      buttsActionCount: 3,
      volunteers: 2,
      volunteersKnownActions: 2,
      volunteersActionCount: 3,
      hours: 1,
    });
    expect(report.monthRows12).toEqual(expect.arrayContaining([
      expect.objectContaining({ month: "2026-03", actions: 3, kg: 2.5, knownWasteActions: 2, butts: 10 }),
    ]));
    expect(report.climate.six).toEqual({ actions: 3, kg: 2.5, butts: 10 });
    expect(report.climate.twelve).toEqual(report.climate.six);
    expect(report.climate.co2AvoidedKg).toBe(2.5 * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg);
    expect(report.climate.waterProtectedLiters).toBe(
      Math.round(10 * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt),
    );
  });

  it("is invariant to action order across totals, time windows, areas and route ordering", () => {
    const actions = [
      makeAction({ id: "north", actionDate: "2026-03-01", wasteKg: 4, cigaretteButts: 20, locationLabel: "Paris 10e", latitude: 48.88 }),
      makeAction({ id: "south", actionDate: "2026-02-01", wasteKg: 1, cigaretteButts: 5, locationLabel: "Paris 15e", latitude: 48.82 }),
      makeAction({ id: "unknown", actionDate: "2026-01-01", wasteKg: null, cigaretteButts: null, volunteersCount: null, locationLabel: "Paris 10e", latitude: 48.87 }),
    ];
    const build = (ordered: ActionListItem[]) => {
      const mapItems = ordered.map((item) => makeMapItem(item));
      return computeReportModel({
        allItems: ordered,
        approvedItems: ordered,
        mapItems,
        events: [],
        now: new Date("2026-03-25T12:00:00.000Z"),
      });
    };
    const selectScientific = (report: ReturnType<typeof computeReportModel>) => ({
      totals: report.totals,
      areas: report.areas,
      monthRows6: report.monthRows6,
      monthRows12: report.monthRows12,
      climate: report.climate,
      recycling: report.recycling,
      routeSteps: report.routeSteps,
    });

    expect(selectScientific(build(actions))).toEqual(selectScientific(build([...actions].reverse())));
  });

  it("keeps projection windows and evidence availability explicit", () => {
    const current = makeAction({ id: "current", actionDate: "2026-03-20", wasteKg: 2 });
    const previous = makeAction({ id: "previous", actionDate: "2026-02-01", wasteKg: 1 });
    const invalid = makeAction({ id: "invalid", actionDate: "not-a-date" });
    const withEvidence = makeAction({ id: "evidence", actionDate: "2026-03-10" });
    withEvidence.contract = {
      ...withEvidence.contract!,
      metadata: {
        ...withEvidence.contract!.metadata,
        photos: [
          { id: "safe", dataUrl: "data:image/png;base64,ZmFrZQ==" },
          { id: "unsafe", dataUrl: "javascript:alert(1)" },
        ] as never,
      },
    };

    const projection = buildReportProjections({
      approvedActions: [current, previous, invalid, withEvidence],
      mapApprovedActions: [makeMapItem(current), makeMapItem(previous)],
      byArea: [{ area: "Paris 1er", actions: 0, kg: 0, butts: 0, recurrence: 0, score: 0 }],
      nowMs: Date.parse("2026-03-25T12:00:00.000Z"),
      totals: { totalKg: 3, totalButts: 30 },
    });

    expect(projection.trendPercent).toBe(100);
    expect(projection.climate6.actions).toBe(3);
    expect(projection.annualRows).toEqual([["Paris 1er", "0", "0,0 kg", "0", "0,00 kg/action"]]);
    expect(projection.highlightActions).toEqual([
      expect.objectContaining({ id: "evidence", photos: ["data:image/png;base64,ZmFrZQ=="] }),
    ]);
    expect(projection.highlightPhotos).toEqual([
      { url: "data:image/png;base64,ZmFrZQ==", label: "Paris 10e", date: "2026-03-10" },
    ]);

    expect(buildReportProjections({
      approvedActions: [],
      mapApprovedActions: [],
      byArea: [],
      nowMs: Date.parse("2026-03-25T12:00:00.000Z"),
      totals: { totalKg: 0, totalButts: 0 },
    }).trendPercent).toBe(0);
  });

  it("does not fabricate ratios when their denominator is unavailable", () => {
    const pending = makeAction({ id: "pending", status: "pending" });
    pending.contract = {
      ...pending.contract!,
      dates: { ...pending.contract!.dates, createdAt: null, validatedAt: null },
    };
    const report = computeReportModel({
      allItems: [pending],
      approvedItems: [],
      mapItems: [],
      events: [],
      now: new Date("2026-03-25T12:00:00.000Z"),
    });
    expect(report.moderation.conversion).toBeNull();
    expect(report.moderation.delayDays).toBeNull();
    expect(report.community.participationRate).toBe(0);
    expect(computeReportRsvpSummary([])).toEqual({
      rsvp: { yes: 0, maybe: 0, no: 0 },
      participationRate: 0,
    });
    expect(computeReportRsvpSummary([makeEvent({ yes: 2, maybe: 1, no: 1 })])).toEqual({
      rsvp: { yes: 2, maybe: 1, no: 1 },
      participationRate: 50,
    });
  });

  it("preserves geometry and availability denominator semantics", () => {
    const action = makeAction({ id: "geometry" });
    const items = [
      makeMapItem(action, { geometryKind: "point", latitude: 48.8, longitude: 2.3 }),
      makeMapItem(action, { geometryKind: "polyline", latitude: 48.81, longitude: 2.31 }),
      makeMapItem(action, { geometryKind: "polygon", latitude: null, longitude: null }),
    ];
    expect(computeMapCoverageMetrics(items)).toEqual({
      geolocatedCount: 2,
      traceCount: 2,
      polylineCount: 1,
      polygonCount: 1,
      geoCoverage: (2 / 3) * 100,
      traceCoverage: (2 / 3) * 100,
    });
    expect(computeMapCoverageMetrics([], { includeGeometryCounts: false })).toEqual({
      geolocatedCount: 0,
      traceCount: 0,
      polylineCount: 0,
      polygonCount: 0,
      geoCoverage: 0,
      traceCoverage: 0,
    });
    expect(computeEnvironmentalProxyMetrics(1_000_000, 0.5)).toEqual({
      waterProtectedLiters: Math.round(1_000_000 * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt),
      co2AvoidedKg: 0.5 * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg,
      recyclableKg: 0.5 * 0.55,
      triIndex: 0,
    });
  });

  it("keeps community aggregation deterministic and does not classify an empty source", () => {
    const alice = makeAction({ id: "alice", actorName: " Alice ", wasteKg: 2, cigaretteButts: 4 });
    const anonymous = makeAction({ id: "anonymous", actorName: "   ", wasteKg: null, cigaretteButts: null });
    const metrics = computeCommunityEngagementMetrics({
      leaderboardItems: [alice, anonymous],
      sourceItems: [
        alice,
        makeAction({ id: "community", source: "community_app" }),
        makeAction({ id: "import", source: "admin_import" }),
        makeAction({ id: "empty", source: "   " }),
      ],
      leaderboardLimit: 8,
    });
    expect(metrics.topLeaderboard).toEqual([
      { name: "Alice", actions: 1, kg: 2, butts: 4 },
      { name: "Anonyme", actions: 1, kg: 0, butts: 0 },
    ]);
    expect(metrics.sourceBuckets).toEqual({ citoyen: 1, associatif: 1, institutionnel: 1 });
  });

  it("preserves legacy-field fallbacks while keeping invalid dates unavailable", () => {
    const legacy = makeAction({ id: "legacy", wasteKg: 2, cigaretteButts: 4, volunteersCount: 2 });
    legacy.contract = undefined;
    const invalidDate = makeAction({ id: "invalid-date", actionDate: "not-a-date" });
    invalidDate.contract = {
      ...invalidDate.contract!,
      dates: { ...invalidDate.contract!.dates, createdAt: "not-a-date", validatedAt: "also-not-a-date" },
    };
    const invalidModeration = makeAction({ id: "invalid-moderation", status: "pending" });
    invalidModeration.contract = {
      ...invalidModeration.contract!,
      dates: { ...invalidModeration.contract!.dates, createdAt: "not-a-date", validatedAt: "also-not-a-date" },
    };

    const report = computeReportModel({
      allItems: [legacy, invalidDate, invalidModeration],
      approvedItems: [legacy, invalidDate],
      mapItems: [],
      events: [],
      now: new Date("2026-03-25T12:00:00.000Z"),
    });

    expect(report.totals).toMatchObject({ kg: 3, butts: 14, volunteers: 3, hours: 1.5 });
    expect(report.quality).toMatchObject({ completenessScore: 50, freshnessDays: 24.5 });
    expect(report.moderation.delayDays).toBeNull();
    expect(computeCommunityEngagementMetrics({
      leaderboardItems: [legacy],
      sourceItems: [],
      leaderboardLimit: 8,
    }).topLeaderboard).toEqual([{ name: "Alice", actions: 1, kg: 2, butts: 4 }]);
  });

  it("excludes invalid action dates from monthly chronology without dropping their totals", () => {
    const civil = makeAction({ id: "civil", actionDate: "2026-02-28", wasteKg: 1 });
    const timestamp = makeAction({
      id: "timestamp",
      actionDate: "2026-03-01T00:30:00+01:00",
      wasteKg: 2,
    });
    const invalid = makeAction({ id: "invalid", actionDate: "not-a-date", wasteKg: 4 });
    const impossible = makeAction({ id: "impossible", actionDate: "2026-02-30", wasteKg: 8 });
    const report = computeReportModel({
      allItems: [civil, timestamp, invalid, impossible],
      approvedItems: [civil, timestamp, invalid, impossible],
      mapItems: [],
      events: [],
      now: new Date("2026-03-25T12:00:00.000Z"),
    });

    expect(report.totals.kg).toBe(15);
    expect(report.totals.actions).toBe(4);
    expect(report.monthRows12).toEqual([
      expect.objectContaining({ month: "2026-02", actions: 2, kg: 3 }),
    ]);
    expect(report.monthRows12.some((row) => row.month === "not-a-d")).toBe(false);
  });

  it("keeps monthly chronology and quality metrics stable across host timezones", () => {
    const originalTimezone = process.env.TZ;
    try {
      const results = ["UTC", "Europe/Paris"].map((timezone) => {
        process.env.TZ = timezone;
        const valid = makeAction({ id: "valid", actionDate: "2026-03-01", wasteKg: 1 });
        const explicitOffset = makeAction({ id: "offset", actionDate: "2026-03-01T00:30:00+01:00", wasteKg: 2 });
        const rejected = makeAction({ id: "no-zone", actionDate: "2026-03-01T00:30:00", wasteKg: 4 });
        const report = computeReportModel({
          allItems: [valid, explicitOffset, rejected],
          approvedItems: [valid, explicitOffset, rejected],
          mapItems: [],
          events: [],
          now: new Date("2026-03-25T12:00:00.000Z"),
        });
        return {
          months: report.monthRows12.map((row) => ({ month: row.month, actions: row.actions, kg: row.kg })),
          totals: { actions: report.totals.actions, kg: report.totals.kg },
          quality: { completenessScore: report.quality.completenessScore, freshnessDays: report.quality.freshnessDays },
        };
      });

      expect(results[0]).toEqual(results[1]);
      expect(results[0]).toMatchObject({
        months: [{ month: "2026-02", actions: 1, kg: 2 }, { month: "2026-03", actions: 1, kg: 1 }],
        totals: { actions: 3, kg: 7 },
        quality: { completenessScore: (2 / 3) * 100 },
      });
      const expectedFreshnessDays = (
        (Date.parse("2026-03-25T12:00:00.000Z") - Date.parse("2026-03-01T00:00:00.000Z")) / 86_400_000
        + (Date.parse("2026-03-25T12:00:00.000Z") - Date.parse("2026-03-01T00:30:00+01:00")) / 86_400_000
      ) / 2;
      expect(results[0]?.quality.freshnessDays).toBeCloseTo(expectedFreshnessDays, 10);
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  it("does not expose a fabricated month in the detailed monthly chapter", () => {
    const valid = makeAction({ id: "valid", actionDate: "2026-03-01" });
    const invalid = makeAction({ id: "invalid", actionDate: "not-a-date" });
    const report = computeReportModel({
      allItems: [valid, invalid],
      approvedItems: [valid, invalid],
      mapItems: [],
      events: [],
      now: new Date("2026-03-25T12:00:00.000Z"),
    });

    const chapter = buildExhaustiveSupplementalChapters({
      report,
      modules: {
        dataAndCartography: false,
        transparencyAndMethods: false,
        rawData: true,
        detailedFiles: false,
      },
    })[0];

    expect(chapter?.rows).toEqual([
      expect.objectContaining({ Mois: "2026-03", Actions: 1 }),
    ]);
    expect(JSON.stringify(chapter)).not.toContain("not-a-d");
  });

  it("protects the small mathematical and formatting contracts used by the model", () => {
    expect(average([])).toBe(0);
    expect(average([2, 4, 8])).toBe(14 / 3);
    expect(median([])).toBe(0);
    expect(median([9, 1, 5, 3])).toBe(4);
    expect(normalizeListType({ record_type: "other" } as ActionListItem)).toBe("spot");
    expect(normalizeListType({ record_type: "clean_place" } as ActionListItem)).toBe("clean_place");
    expect(normalizeListType({ record_type: "action" } as ActionListItem)).toBe("action");
    expect(toFrNumber(12.345, 2)).toBe("12,35");
    expect(toFrInt(1_234)).toBe("1 234");
    expect(toFrOptionalNumber(null)).toBe("Indisponible");
    expect(toFrOptionalInt(null)).toBe("Indisponible");
    expect(toFrDate("not-a-date")).toBe("not-a-date");
    expect(toFrDate("2026-03-25T00:00:00.000Z")).toContain("2026");
    expect(buildMonthRows([makeAction({ actionDate: "not-a-date" })])).toEqual([]);
    expect(buildCalendarRows(new Date("2026-11-15T00:00:00.000Z"))).toHaveLength(4);
    expect(buildRouteSteps([makeMapItem(makeAction({ latitude: null, longitude: null }))], 6)).toEqual([]);
  });

  it("exposes the exact runtime methodology version, factors and provenance", () => {
    const methodology = buildActionImpactMethodology();
    expect(methodology.version).toBe(IMPACT_PROXY_CONFIG.version);
    expect(methodology.factors).toEqual(IMPACT_PROXY_CONFIG.factors);
    expect(methodology.sources).toEqual(IMPACT_PROXY_CONFIG.sources);
    expect(methodology.formulas.co2e).toContain(String(IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg));
    expect(methodology.formulas.water).toContain(String(IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt));
    expect(methodology.formulas.wasteKg).toContain("null = métrique non renseignée");
    expect(methodology.formulas.wasteKg).not.toContain("cigaretteButts /");
  });
});
