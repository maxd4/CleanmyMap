import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RouteExplanationData } from "./route-explanation.model";
import { riskLabel } from "./route-explanation.model";
import { RouteExplanation } from "./route-explanation";

function dataFor(mode: "network" | "fallback"): RouteExplanationData {
  const observedEvidence = {
    family: "observed" as const,
    source: "trash_spotter_spots" as const,
    proof: "validated" as const,
    observedAt: "2026-08-20T10:00:00.000Z",
  };
  return {
    isLoop: true,
    planningMode: { type: "free" },
    origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
    travelDistanceKm: 2.4,
    travelMinutes: 32,
    loop: {
      isLoop: true,
      origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
      returnDistanceKm: 1.2,
      returnMinutes: 16,
      budgetRemainingMinutes: 28,
    },
    stops: [{
      id: "spot-1",
      label: "Place de test",
      latitude: 48.86,
      longitude: 2.35,
    }],
    trace: {
      engineVersion: "route-planner-v2",
      planningMode: { type: "free" },
      parameters: { travelBudgetMinutes: 60, maxStops: 6, priorityVsTravel: 65 },
      origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
      candidates: { loaded: 1, admissible: 1, excluded: 0, excludedByReason: {} },
      selectedStops: mode === "network" ? [{
        step: 1,
        id: "spot-1",
        criteriaUsed: ["priority_score", "incremental_travel_cost", "return_travel_cost"],
        normalizedScoreComponents: { priority: 0.8, travel: 0.9 },
        combinedScore: 0.835,
        incrementalDistanceKm: 1.2,
        incrementalTravelMinutes: 16,
        cumulativeTravelMinutes: 16,
        returnDistanceKm: 1.2,
        returnTravelMinutes: 16,
        loopDistanceKm: 2.4,
        loopTravelMinutes: 32,
        budgetAfterReturnMinutes: 28,
        budgetBeforeMinutes: 60,
        budgetAfterMinutes: 44,
        reason: "Étape 1: sélection dans le budget.",
        targetFamily: "observed",
        evidence: observedEvidence,
        eventContributions: [],
        eventScoreContribution: 0,
      }] : [],
      loop: {
        isLoop: true,
        origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
        returnDistanceKm: 1.2,
        returnMinutes: 16,
        budgetRemainingMinutes: 28,
      },
      ordering: {
        stopIds: mode === "network" ? ["spot-1"] : [],
        criteria: ["combined_score_desc", "priority_desc", "incremental_travel_asc", "id_lexicographic"],
      },
      budget: { requestedMinutes: 60, consumedMinutes: 32, remainingMinutes: 28 },
      distance: { totalKm: 2.4, segmentsTotalKm: 2.4 },
      duration: { networkMinutes: mode === "network" ? 32 : null, estimatedMinutes: mode === "fallback" ? 32 : null, serviceMinutes: null, totalMinutes: 32 },
      routing: {
        provider: mode === "network" ? "fossgis-osrm" : "none",
        profile: mode === "network" ? "foot" : null,
        mode,
        estimated: mode === "fallback",
        parameters: { walkingSpeedKmPerHour: 4.5, coordinateCount: 3, budgetPrefixApplied: false },
        opaqueProviderDecisions: [],
        degradations: [],
      },
      segments: mode === "network" ? [{
        from: "origin",
        to: "spot-1",
        distanceKm: 1.2,
        durationMinutes: 16,
        measured: true,
        streetSteps: [{ name: "Rue de Test", distanceKm: 1.2, durationMinutes: 16, maneuver: "depart" }],
      }, {
        from: "spot-1",
        to: "origin",
        distanceKm: 1.2,
        durationMinutes: 16,
        measured: true,
        streetSteps: [{ name: "Rue du Retour", distanceKm: 1.2, durationMinutes: 16, maneuver: "arrive" }],
      }] : [{
        from: "origin",
        to: "spot-1",
        distanceKm: 1.2,
        durationMinutes: 16,
        measured: false,
        streetSteps: [],
      }, {
        from: "spot-1",
        to: "origin",
        distanceKm: 1.2,
        durationMinutes: 16,
        measured: false,
        streetSteps: [],
      }],
      warnings: [],
      approximations: mode === "fallback" ? ["distance estimée"] : [],
      fallbacks: mode === "fallback" ? ["fallback_route_geometry"] : [],
    },
  } as unknown as RouteExplanationData;
}

describe("RouteExplanation", () => {
  it("exposes trace-backed selection and network street details", () => {
    const markup = renderToStaticMarkup(<RouteExplanation data={dataFor("network")} fr />);

    expect(markup).toContain("Comprendre cet itinéraire");
    expect(markup).toContain("Étape 1: sélection dans le budget.");
    expect(markup).toContain("Rue de Test");
    expect(markup).toContain("Mesure réseau");
    expect(markup).toContain("Boucle de 2,4 km · départ et arrivée au même endroit");
    expect(markup).toContain("retour réserve 16 min");
    expect(markup).toContain("Rue du Retour");
    expect(markup).toContain("<summary");
    expect(markup).toContain("Pollution probable : 0 %");
    expect(markup).toContain("contribution planner : 83,5 %");
    expect(markup).not.toContain("sur 100");
  });

  it("formats route risk scores as French percentages", () => {
    expect(riskLabel(63)).toBe("63 %");
    expect(riskLabel(63.5)).toBe("63,5 %");
  });

  it("explains the selected predictive branch without reweighting observed spots", () => {
    const data = dataFor("network");
    data.trace.parameters = {
      ...data.trace.parameters,
      pickupPreference: "cigarette_butts",
      effectiveRiskFocus: "cigaretteButts",
    };
    const markup = renderToStaticMarkup(<RouteExplanation data={data} fr />);

    expect(markup).toContain("Préférence : mégots");
    expect(markup).toContain("risque mégots a été utilisé");
    expect(markup).toContain("signalements observés conservent leurs preuves et leur scoring propres");
  });

  it("does not invent street details for fallback geometry", () => {
    const markup = renderToStaticMarkup(<RouteExplanation data={dataFor("fallback")} fr />);

    expect(markup).toContain("aucune liste fictive de rues");
    expect(markup).not.toContain("Rue de Test");
    expect(markup).toContain("estimé");
  });

  it("shows validated observed evidence when it is available", () => {
    const markup = renderToStaticMarkup(<RouteExplanation data={dataFor("network")} fr />);

    expect(markup).toContain("Signalement observé validé");
    expect(markup).not.toContain("Preuve terrain indisponible");
  });

  it("keeps the observed explanation fail-closed without evidence", () => {
    const data = dataFor("network");
    Reflect.deleteProperty(data.trace.selectedStops[0]!, "evidence");
    const markup = renderToStaticMarkup(<RouteExplanation data={data} fr />);

    expect(markup).toContain("Preuve terrain indisponible");
    expect(markup).not.toContain("Signalement observé validé");
  });

  it("distinguishes an event-centered route from a free route", () => {
    const data = dataFor("network");
    const eventMode = {
      type: "event-centered",
      eventId: "event-1",
    } as const;
    data.planningMode = eventMode;
    data.trace.planningMode = eventMode;
    data.trace.eventCentered = {
      event: {
        id: "event-1",
        title: "Fête de quartier",
        eventDate: "2026-09-03",
        locationLabel: "Place de test",
        latitude: 48.8566,
        longitude: 2.3522,
      },
      temporalStatus: "past",
      ageDays: 1,
      distanceFromOriginKm: 0.4,
      role: "post_event_anchor",
      radiusKm: 2,
      anchorWeight: 0.55,
      favoredCandidateIds: ["spot-1"],
      outsideAnchorRadiusCandidateIds: [],
      selectedCandidateIds: ["spot-1"],
      candidateImpacts: [],
    };

    const markup = renderToStaticMarkup(<RouteExplanation data={data} fr />);

    expect(markup).toContain("Itinéraire construit autour de cet événement");
    expect(markup).toContain("Fête de quartier");
    expect(markup).toContain("Rôle : ancrage post-événement");
  });
});
