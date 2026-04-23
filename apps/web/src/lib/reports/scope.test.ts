import { describe, expect, it } from "vitest";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import {
  buildReportScopeOptions,
  filterActionContractsByScope,
  filterCommunityEventsByScope,
  formatReportScopeLabel,
} from "./scope";

describe("report scope helpers", () => {
  const contract: ActionDataContract = {
    id: "action-1",
    type: "action",
    status: "approved",
    source: "actions",
    createdByClerkId: "user-1",
    location: { label: "Paris 11e - Bastille", latitude: 48.85, longitude: 2.35 },
    geometry: {
      kind: "point",
      coordinates: [[48.85, 2.35] as [number, number]],
      geojson: null,
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
      placeType: "N° Boulevard/Avenue/Place",
      departureLocationLabel: null,
      arrivalLocationLabel: null,
      routeStyle: null,
      routeAdjustmentMessage: null,
      notes: null,
      notesPlain: null,
      submissionMode: null,
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
            title: "Collecte Bastille",
            eventDate: "2026-04-10",
            locationLabel: "Paris 11e",
            description: "Collectif Test",
            capacityTarget: null,
            attendanceCount: null,
            postMortem: null,
            rsvpCounts: { yes: 1, maybe: 0, no: 0, total: 1 },
            myRsvpStatus: null,
          },
        ],
        { kind: "account", value: "user-1" },
      ),
    ).toHaveLength(1);
  });
});
