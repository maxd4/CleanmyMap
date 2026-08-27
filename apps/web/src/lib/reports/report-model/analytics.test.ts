import { describe, expect, it } from"vitest";
import type { ActionListItem, ActionMapItem } from"@/lib/actions/types";
import type { CommunityEventItem } from"@/lib/community/http";
import {
 buildMonthRows,
 buildExecutiveNarrative,
 buildRouteSteps,
} from "@/lib/reports/report-model/builders";
import { computeCommunityEngagementMetrics } from "@/lib/reports/report-model/metrics";
import { computeReportModel } from "@/lib/reports/report-model/compute-report-model";
import { sumActionImpactKpis } from "@/lib/actions/impact-calculators";

function makeListItem(overrides: Partial<ActionListItem> = {}): ActionListItem {
 return {
 id:"a-1",
 status:"approved",
 action_date:"2026-03-02",
 waste_kg: 10,
 cigarette_butts: 200,
 volunteers_count: 4,
 duration_minutes: 60,
 location_label:"Paris 10e",
 record_type:"action",
 actor_name:"Alice",
 source:"web_form",
 created_at:"2026-03-01T08:00:00.000Z",
 association_name:"Assoc",
 notes: null,
 website_url: null,
 contract: {
 id:"a-1",
 type:"action",
 status:"approved",
 source:"web_form",
 location: { label:"Paris 10e", latitude: 48.87, longitude: 2.36 },
 geometry: {
 kind:"point",
 coordinates: [[48.87, 2.36]],
 geojson: null,
 confidence: 0.24,
 origin:"fallback_point",
 },
 dates: {
 observedAt:"2026-03-02",
 createdAt:"2026-03-01T08:00:00.000Z",
 importedAt: null,
 validatedAt:"2026-03-03T10:00:00.000Z",
 },
 metadata: {
 actorName:"Alice",
 associationName:"Assoc",
 notes: null,
 notesPlain: null,
 submissionMode: null,
 wasteBreakdown: null,
 wasteKg: 10,
 cigaretteButts: 200,
 volunteersCount: 4,
 durationMinutes: 60,
 manualDrawing: null,
 },
 },
 ...overrides,
 } as unknown as ActionListItem;
}

function makeMapItem(
 overrides: Partial<ActionMapItem> = {},
 location: { latitude: number; longitude: number; label?: string } = {
 latitude: 48.87,
 longitude: 2.36,
 label:"Paris 10e",
 },
): ActionMapItem {
 return {
 id:"m-1",
 status:"approved",
 location_label: location.label ??"Paris 10e",
 waste_kg: 10,
 cigarette_butts: 200,
 contract: {
 id:"m-1",
 type:"action",
 status:"approved",
 source:"web_form",
 location: {
 label: location.label ??"Paris 10e",
 latitude: location.latitude,
 longitude: location.longitude,
 },
 geometry: {
 kind:"point",
 coordinates: [[location.latitude, location.longitude]],
 geojson: null,
 },
 dates: {
 observedAt:"2026-03-02",
 createdAt:"2026-03-01T08:00:00.000Z",
 importedAt: null,
 validatedAt:"2026-03-03T10:00:00.000Z",
 },
 metadata: {
 actorName:"Alice",
 associationName:"Assoc",
 notes: null,
 notesPlain: null,
 submissionMode: null,
 wasteBreakdown: null,
 wasteKg: 10,
 cigaretteButts: 200,
 volunteersCount: 4,
 durationMinutes: 60,
 manualDrawing: null,
 },
 },
 ...overrides,
 } as unknown as ActionMapItem;
}

function makeEvent(overrides: Partial<CommunityEventItem> = {}): CommunityEventItem {
 return {
 id:"e-1",
 createdAt:"2026-03-01T08:00:00.000Z",
 organizerClerkId:"org_1",
 title:"Nettoyage canal",
 eventDate:"2026-03-20",
 locationLabel:"Canal",
 description: null,
 capacityTarget: 20,
 attendanceCount: 12,
 postMortem:"ok",
 cleanupObjective: null,
 cleanupZone: null,
 cleanupLogisticsNeeds: null,
 cleanupSupportLevel: null,
 cleanupWasteTypesExpected: [],
 rsvpCounts: { yes: 10, maybe: 2, no: 1, total: 13 },
 myRsvpStatus: null,
 ...overrides,
 };
}

describe("reports web analytics", () => {
 it("keeps report totals and climate proxies aligned with the canonical contract corpus", () => {
 const baseContract = makeListItem().contract!;
 const declared = makeListItem({
   id: "declared",
   waste_kg: 2,
   cigarette_butts: 100,
   volunteers_count: 2,
   contract: {
     ...baseContract,
     id: "declared",
     metadata: { ...baseContract.metadata, wasteKg: 2, cigaretteButts: 100, volunteersCount: 2 },
   },
 });
 const buttsOnly = makeListItem({
   id: "butts-only",
   waste_kg: null,
   cigarette_butts: 13_875,
   volunteers_count: 3,
   contract: {
     ...baseContract,
     id: "butts-only",
     metadata: { ...baseContract.metadata, wasteKg: null, cigaretteButts: 13_875, volunteersCount: 3 },
   },
 });
 const expected = sumActionImpactKpis([declared.contract!, buttsOnly.contract!]);
 const report = computeReportModel({
   allItems: [declared, buttsOnly],
   approvedItems: [declared, buttsOnly],
   mapItems: [
     makeMapItem({ id: "declared-map", contract: declared.contract }),
     makeMapItem({ id: "butts-map", waste_kg: null, cigarette_butts: 13_875, contract: buttsOnly.contract }),
   ],
   events: [],
   now: new Date("2026-03-25T12:00:00.000Z"),
 });

 expect(report.totals.kg).toBe(expected.wasteKg);
 expect(report.totals.butts).toBe(expected.butts);
 expect(report.totals.volunteers).toBe(expected.volunteers);
 expect(report.climate.co2AvoidedKg).toBe(expected.co2AvoidedKg);
 expect(report.climate.waterProtectedLiters).toBe(expected.waterSavedLiters);
 expect(report.climate.streetCleaningSavingsEuros).toBe(expected.euroSaved);
 expect(report.monthRows6.reduce((sum, row) => sum + row.kg, 0)).toBe(expected.wasteKg);
 });

 it("groups monthly rows by month key", () => {
 const rows = buildMonthRows([
 makeListItem({ id:"a-1", action_date:"2026-01-05", waste_kg: 2 }),
 makeListItem({ id:"a-2", action_date:"2026-01-18", waste_kg: 3 }),
 makeListItem({ id:"a-3", action_date:"2026-02-02", waste_kg: 4 }),
 ]);
 expect(rows).toHaveLength(2);
 expect(rows[0]?.kg).toBe(20);
 expect(rows[1]?.kg).toBe(10);
 });

 it("builds route steps with positive segment distances", () => {
 const steps = buildRouteSteps(
 [
 makeMapItem({ id:"m-1" }, { label:"A", latitude: 48.85, longitude: 2.35 }),
 makeMapItem({ id:"m-2" }, { label:"B", latitude: 48.86, longitude: 2.36 }),
 ],
 6,
 );
 expect(steps).toHaveLength(2);
 expect(steps[0]?.segmentKm).toBe(0);
 expect(steps[1]?.segmentKm).toBeGreaterThan(0);
 });

 it("does not count a point without contract geometry as a trace", () => {
 const report = computeReportModel({
 allItems: [],
 approvedItems: [],
 mapItems: [
 makeMapItem(
 { id:"m-no-contract", contract: undefined },
 { label:"Point sans contrat", latitude: 48.85, longitude: 2.35 },
 ),
 ],
 events: [],
 now: new Date("2026-03-25T12:00:00.000Z"),
 });

 expect(report.map.points).toBe(1);
 expect(report.map.traces).toBe(0);
 });

 it("computes model summary and community buckets", () => {
 const report = computeReportModel({
 allItems: [
 makeListItem({ id:"all-1", status:"approved", source:"web_form" }),
 makeListItem({ id:"all-2", status:"pending", source:"community_app" }),
 makeListItem({ id:"all-3", status:"rejected", source:"admin_import" }),
 ],
 approvedItems: [makeListItem({ id:"approved-1", status:"approved" })],
 mapItems: [makeMapItem({ id:"map-1" })],
 events: [makeEvent()],
 now: new Date("2026-03-25T12:00:00.000Z"),
 });
 expect(report.totals.actions).toBe(1);
 expect(report.moderation.pending).toBe(1);
 expect(report.moderation.rejected).toBe(1);
 expect(report.moderation.approved).toBe(1);
 expect(report.community.sourceBuckets.citoyen).toBe(1);
 expect(report.community.sourceBuckets.associatif).toBe(1);
 expect(report.community.sourceBuckets.institutionnel).toBe(1);
 expect(report.impactMethodology.formulas).toHaveLength(4);
 expect(report.impactMethodology.proxyVersion.length).toBeGreaterThan(0);
 });

 it("keeps approved-only moderation explicitly unavailable", () => {
 const report = computeReportModel({
 allItems: [makeListItem({ id:"approved-only", status:"approved" })],
 approvedItems: [makeListItem({ id:"approved-only", status:"approved" })],
 mapItems: [makeMapItem({ id:"approved-only" })],
 events: [],
 moderationAvailability: "unavailable",
 now: new Date("2026-03-25T12:00:00.000Z"),
 });

 expect(report.moderation).toEqual({
 availability: "unavailable",
 pending: null,
 approved: 1,
 rejected: null,
 conversion: null,
 delayDays: null,
 });
 expect(report.executive.watchouts[0]).toContain("Indisponible");
 });

 it("does not score a missing waste measure as complete", () => {
 const report = computeReportModel({
 allItems: [makeListItem({ id:"missing-waste", waste_kg:null })],
 approvedItems: [makeListItem({ id:"missing-waste", waste_kg:null })],
 mapItems: [makeMapItem({ id:"missing-waste", waste_kg:null })],
 events: [],
 });

 expect(report.quality.completenessScore).toBe(0);
 expect(report.quality.coherenceScore).toBe(0);
 });

 it("does not assign an unknown source to the citizen bucket", () => {
 const item = makeListItem({
 id:"unknown-source",
 source:undefined as unknown as string,
 contract: {
 ...makeListItem().contract as NonNullable<ActionListItem["contract"]>,
 source:undefined as unknown as string,
 },
 });
 const metrics = computeCommunityEngagementMetrics({
 leaderboardItems: [item],
 sourceItems: [item],
 leaderboardLimit: 8,
 });

 expect(metrics.sourceBuckets).toEqual({ citoyen: 0, associatif: 0, institutionnel: 0 });
 });

 it("builds a narrative suitable for an institutional cover", () => {
 const report = computeReportModel({
 allItems: [makeListItem({ id:"all-1", status:"approved" })],
 approvedItems: [makeListItem({ id:"approved-1", status:"approved" })],
 mapItems: [makeMapItem({ id:"map-1" })],
 events: [makeEvent()],
 now: new Date("2026-03-25T12:00:00.000Z"),
 });

 const narrative = buildExecutiveNarrative(report);

 expect(narrative.headline.length).toBeGreaterThan(0);
 expect(narrative.summary).toContain("géolocalisation");
 expect(narrative.evidence).toHaveLength(4);
 expect(narrative.budgetUseCases).toHaveLength(3);
 expect(narrative.watchouts.length).toBeGreaterThan(0);
 });
});
