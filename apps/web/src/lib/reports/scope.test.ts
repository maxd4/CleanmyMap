import { expect, it } from "vitest";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import {
  buildReportScopeOptions,
  computeReportAccountScopeCoverage,
  filterActionContractsByScope,
  filterCommunityEventsByScope,
  filterReportScopeItems,
  formatReportScopeLabel,
  normalizeReportScope,
} from "./scope";

const contract: ActionDataContract = {
  id: "action-1",
  type: "action",
  status: "approved",
  source: "actions",
  createdByClerkId: "user-1",
  location: {
    label: "Paris 11e - Bastille",
    latitude: 48.85,
    longitude: 2.35,
    departmentCode: null,
    departmentName: null,
  },
  geometry: {
    kind: "point",
    coordinates: [[48.85, 2.35] as [number, number]],
    geojson: null,
    confidence: 0.24,
    geometrySource: "fallback_point",
    origin: "fallback_point",
  },
  dates: {
    observedAt: "2026-04-01",
    createdAt: "2026-04-01T10:00:00Z",
    importedAt: null,
    validatedAt: null,
  },
  metadata: {
    actorName: "Alice",
    associationName: "Collectif Test",
    organizerType: null,
    placeType: "N° Boulevard/Avenue/Place",
    departureLocationLabel: null,
    arrivalLocationLabel: null,
    routeStyle: null,
    routeAdjustmentMessage: null,
    notes: null,
    notesPlain: null,
    groupJoinEnabled: true,
    submissionMode: null,
    actionPhase: "post_action_complete",
    preparationData: null,
    wasteBreakdown: null,
    photos: null,
    visionEstimate: null,
    wasteKg: 12,
    cigaretteButts: 120,
    volunteersCount: 3,
    durationMinutes: 45,
    manualDrawing: null,
  },
} as const;

it("builds readable labels from available options", () => {
  const options = buildReportScopeOptions([
    {
      created_by_clerk_id: "user-1",
      actor_name: "Alice",
      association_name: "Collectif Test",
      location_label: "Paris 11e - Bastille",
    },
  ]);

  expect(options.accounts[0]?.label).toBe("Alice");
  expect(options.associations[0]?.label).toBe("Collectif Test");
  expect(options.arrondissements[0]?.label).toBe("Paris 11e");
  expect(
    formatReportScopeLabel(
      { kind: "account", value: "user-1" },
      options,
    ),
  ).toBe("Alice");
});

it("keeps fallback labels and scope matching on canonical fields only", () => {
  const sources = [
    {
      created_by_clerk_id: "  user-2  ",
      actor_name: null,
      association_name: null,
      location_label: "Lyon 2e",
    },
    {
      contract: {
        createdByClerkId: "User-3",
        metadata: { actorName: null, associationName: "  Association A  " },
        location: { label: "Paris 5e" },
      },
    },
    {
      contract: {
        createdByClerkId: null,
        metadata: { actorName: null, associationName: null },
        location: { label: null },
      },
    },
  ];

  const options = buildReportScopeOptions(sources);
  expect(options.accounts).toEqual([
    { value: "user-2", label: "Compte user-2", count: 1 },
    { value: "User-3", label: "Compte User-3", count: 1 },
  ]);
  expect(options.associations).toEqual([
    { value: "Association A", label: "Association A", count: 1 },
  ]);
  expect(options.arrondissements).toEqual([
    { value: "5", label: "Paris 5e", count: 1 },
  ]);

  expect(formatReportScopeLabel({ kind: "account", value: "abcdefgh-123" })).toBe("Compte abcdefgh");
  expect(formatReportScopeLabel({ kind: "association", value: "Association libre" })).toBe("Association libre");
  expect(formatReportScopeLabel({ kind: "arrondissement", value: "9" })).toBe("Arrondissement 9e");

  expect(filterReportScopeItems(sources, { kind: "global", value: null })).toBe(sources);
  expect(filterReportScopeItems(sources, { kind: "account", value: "USER-3" })).toHaveLength(1);
  expect(filterReportScopeItems(sources, { kind: "association", value: "association a" })).toHaveLength(1);
  expect(filterReportScopeItems(sources, { kind: "arrondissement", value: "5" })).toHaveLength(1);
  expect(filterReportScopeItems(sources, { kind: "account", value: "unknown" })).toEqual([]);
  expect(filterReportScopeItems(sources, { kind: "arrondissement", value: "2" })).toEqual([]);
});

it.each([
  { kind: "account", value: null },
  { kind: "association", value: "" },
  { kind: "arrondissement", value: undefined },
  { kind: "not-a-scope", value: "value" },
])("rejects invalid non-global scope input", (input) => {
  expect(() => normalizeReportScope(input as never)).toThrow("scope is invalid");
});

it("ignores non-Paris arrondissement labels in scope buckets", () => {
  const options = buildReportScopeOptions([
    {
      location_label: "Lyon 2e",
    },
  ]);

  expect(options.arrondissements).toHaveLength(0);
});

it("filters contracts and community events by scope", () => {
  expect(
    filterActionContractsByScope([contract], {
      kind: "account",
      value: "user-1",
    }),
  ).toHaveLength(1);
  expect(
    filterActionContractsByScope([contract], {
      kind: "association",
      value: "Collectif Test",
    }),
  ).toHaveLength(1);
  expect(
    filterActionContractsByScope([contract], {
      kind: "arrondissement",
      value: "11",
    }),
  ).toHaveLength(1);
  expect(
    filterActionContractsByScope([contract], {
      kind: "account",
      value: "user-2",
    }),
  ).toHaveLength(0);

  expect(
    filterCommunityEventsByScope(
      [
        {
          id: "event-1",
          createdAt: "2026-04-01T10:00:00Z",
          organizerClerkId: "user-1",
          canEditOwnOps: false,
          title: "Collecte Bastille",
          eventDate: "2026-04-10",
          locationLabel: "Paris 11e",
          location: { label: "Paris 11e", latitude: null, longitude: null, source: null },
          description: "Collectif Test",
          capacityTarget: null,
          attendanceCount: null,
          postMortem: null,
          cleanupObjective: null,
          cleanupZone: null,
          cleanupLogisticsNeeds: null,
          cleanupSupportLevel: null,
          cleanupWasteTypesExpected: [],
          rsvpCounts: { yes: 1, maybe: 0, no: 0, total: 1 },
          myRsvpStatus: null,
        },
      ],
      { kind: "account", value: "user-1" },
    ),
  ).toHaveLength(1);
});

it("keeps global and arrondissement event scopes bounded to structured locations", () => {
  const events = [
    {
      id: "paris-11",
      organizerClerkId: "user-1",
      locationLabel: "Paris 11e",
    },
    {
      id: "lyon-2",
      organizerClerkId: "user-1",
      locationLabel: "Lyon 2e",
    },
  ] as never;

  expect(filterCommunityEventsByScope(events, { kind: "global", value: null })).toBe(events);
  expect(filterCommunityEventsByScope(events, { kind: "arrondissement", value: "11" }).map((event) => event.id)).toEqual([
    "paris-11",
  ]);
  expect(filterCommunityEventsByScope(events, { kind: "association", value: "Association A" })).toEqual([]);
  expect(filterActionContractsByScope([contract], { kind: "global", value: null })).toEqual([contract]);
});

it("does not attribute an event to an association from free text", () => {
  const event = {
    id: "event-association-text",
    createdAt: "2026-04-01T10:00:00Z",
    organizerClerkId: "other-organizer",
    canEditOwnOps: false,
    title: "Collectif Test - nettoyage",
    eventDate: "2026-04-10",
    locationLabel: "Paris 11e",
    location: { label: "Paris 11e", latitude: null, longitude: null, source: null },
    description: "Événement mentionnant Collectif Test sans rattachement canonique.",
    capacityTarget: null,
    attendanceCount: null,
    postMortem: null,
    cleanupObjective: null,
    cleanupZone: null,
    cleanupLogisticsNeeds: null,
    cleanupSupportLevel: null,
    cleanupWasteTypesExpected: [],
    rsvpCounts: { yes: 2, maybe: 0, no: 0, total: 2 },
    myRsvpStatus: null,
  };

  expect(
    filterCommunityEventsByScope([event], {
      kind: "association",
      value: "Collectif Test",
    }),
  ).toEqual([]);
});

it("computes account coverage for created_by_clerk_id", () => {
  const coverage = computeReportAccountScopeCoverage([
    {
      created_by_clerk_id: "user-1",
      actor_name: "Alice",
    },
    {
      created_by_clerk_id: null,
      actor_name: "Bob",
    },
    {
      contract: { createdByClerkId: "user-3" },
      actor_name: "Charlie",
    },
  ]);

  expect(coverage.total).toBe(3);
  expect(coverage.withCreatedByClerkId).toBe(2);
  expect(coverage.missingCreatedByClerkId).toBe(1);
  expect(coverage.coveragePercent).toBeCloseTo(66.67, 1);
  expect(coverage.hasMeasurableBase).toBe(true);
});

it("marks coverage as not measurable when dataset is empty", () => {
  const coverage = computeReportAccountScopeCoverage([]);

  expect(coverage.total).toBe(0);
  expect(coverage.withCreatedByClerkId).toBe(0);
  expect(coverage.missingCreatedByClerkId).toBe(0);
  expect(coverage.coveragePercent).toBe(0);
  expect(coverage.hasMeasurableBase).toBe(false);
});
