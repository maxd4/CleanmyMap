import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RouteResponse } from "../route-types";
import {
  getRecentRouteEventOpportunities,
  RouteEventOpportunities,
} from "./route-event-opportunities";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));
vi.mock("lucide-react", () => ({
  CalendarDays: "span",
  MapPin: "span",
  TrendingUp: "span",
}));
vi.mock("@/components/ui/cmm-card", () => ({
  CmmCard: ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement("section", props, children),
}));
vi.mock("@/components/ui/cmm-pill", () => ({
  CmmPill: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", null, children),
}));

function dataWithEvents(): RouteResponse {
  return {
    status: "ok",
    planningMode: { type: "free" },
    dataStatus: "complete",
    isTruncated: false,
    sourceHealth: { partial: false, failedSources: [], availableSources: ["spots"], warnings: [] },
    origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
    travelDistanceKm: 2,
    travelMinutes: 27,
    travelBudgetMinutes: 60,
    withinBudget: true,
    serviceMinutesEstimate: null,
    totalMinutesEstimate: null,
    diagnostics: {
      loaded: 2,
      eligible: 2,
      excluded: 0,
      selected: 1,
      sourcePartial: false,
      truncated: false,
      excludedUnsafe: 0,
      excludedByTravelBudget: 0,
    },
    generatedAt: "2026-09-04T00:00:00.000Z",
    engineVersion: "route-planner-v1",
    stops: [{
      id: "spot-1",
      label: "Quai de test",
      latitude: 48.86,
      longitude: 2.35,
      segmentKm: 2,
      estimatedMinutes: 27,
      priorityReason: "Priorité",
      score: 80,
    }],
    routeGeometry: {
      coordinates: [],
      distanceKm: 2,
      durationMinutes: 27,
      legs: [],
      provider: "fossgis-osrm",
      profile: "foot",
      mode: "network",
      estimated: false,
    },
    scoreBreakdown: { priority: 80, distance: 90 },
    tradeoffs: [],
    proactiveAssistant: {
      actNow: "",
      criticalNearby: "",
      mostUsefulAction: "",
      operationalSignalZones: [],
      upcomingEvents: [],
      hotspots: [],
    },
    trace: {
      engineVersion: "route-planner-v1",
      planningMode: { type: "free" },
      parameters: { travelBudgetMinutes: 60, maxStops: 6, priorityVsTravel: 65 },
      origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
      candidates: { loaded: 2, admissible: 2, excluded: 0, excludedByReason: {} },
      selectedStops: [{
        step: 1,
        id: "spot-1",
        criteriaUsed: ["priority_score", "incremental_travel_cost"],
        normalizedScoreComponents: { priority: 0.8, travel: 0.9 },
        combinedScore: 0.835,
        incrementalDistanceKm: 2,
        incrementalTravelMinutes: 27,
        cumulativeTravelMinutes: 27,
        budgetBeforeMinutes: 60,
        budgetAfterMinutes: 33,
        reason: "Choisi",
        eventContributions: [{
          eventId: "event-1",
          title: "Fête de quartier",
          eventDate: "2026-09-02",
          locationLabel: "Place de test",
          latitude: 48.86,
          longitude: 2.35,
          ageDays: 2,
          distanceKm: 0.3,
          recencyFactor: 0.9,
          proximityFactor: 0.85,
          attendanceFactor: 0.7,
          attendanceEvidence: { yes: 4, maybe: 1, capacityTarget: null, known: true },
          pressure: 0.5355,
          scoreContribution: 10.71,
        }],
        eventScoreContribution: 10.71,
      }],
      ordering: {
        stopIds: ["spot-1"],
        criteria: ["combined_score_desc", "priority_desc", "incremental_travel_asc", "id_lexicographic"],
      },
      budget: { requestedMinutes: 60, consumedMinutes: 27, remainingMinutes: 33 },
      distance: { totalKm: 2, segmentsTotalKm: 2 },
      duration: { networkMinutes: 27, estimatedMinutes: null, serviceMinutes: null, totalMinutes: 27 },
      routing: {
        provider: "fossgis-osrm",
        profile: "foot",
        mode: "network",
        estimated: false,
        parameters: { walkingSpeedKmPerHour: 4.5, coordinateCount: 2, budgetPrefixApplied: false },
        opaqueProviderDecisions: [],
        degradations: [],
      },
      segments: [],
      warnings: [],
      approximations: [],
      fallbacks: [],
      eventSignal: {
        completedEventsConsidered: 2,
        geolocatedCompletedEvents: 1,
        eventsWithoutCoordinates: 1,
        sourceAvailable: true,
        recentWindowDays: 16,
        signalHorizonDays: 56,
        spatialRadiusKm: 2,
        maxScoreBoost: 20,
      },
      eventCentered: null,
    },
  };
}

describe("RouteEventOpportunities", () => {
  it("renders recent engine-backed events and the canonical action link", () => {
    const data = dataWithEvents();
    const markup = renderToStaticMarkup(<RouteEventOpportunities data={data} fr />);

    expect(getRecentRouteEventOpportunities(data)).toHaveLength(1);
    expect(markup).toContain("Événements récents");
    expect(markup).toContain("Fête de quartier");
    expect(markup).toContain("Place de test");
    expect(markup).toContain("Pression 53,6 %");
    expect(markup).toContain("Créer une action");
    expect(markup).toContain("/actions/new?fromEventId=event-1");
    expect(markup).toContain("Créer un itinéraire autour de cet événement");
    expect(markup).toContain("planningMode=event-centered");
    expect(markup).toContain("pas un constat de déchets");
  });

  it("does not present future or out-of-window events", () => {
    const data = dataWithEvents();
    data.trace.selectedStops[0]!.eventContributions[0]!.ageDays = 17;

    const markup = renderToStaticMarkup(<RouteEventOpportunities data={data} fr />);

    expect(getRecentRouteEventOpportunities(data)).toEqual([]);
    expect(markup).toContain("Aucun événement récent géolocalisé");
    expect(markup).not.toContain("Fête de quartier");
  });
});
