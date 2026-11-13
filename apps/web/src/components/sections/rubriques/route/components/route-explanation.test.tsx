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
      parameters: {
        travelBudgetMinutes: 60,
        maxStops: 6,
        priorityVsTravel: 65,
        pickupPreference: "balanced",
        effectiveRiskFocus: "all",
      },
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
      duration: { networkMinutes: mode === "network" ? 32 : null, estimatedMinutes: mode === "fallback" ? 32 : null, serviceMinutes: null, uncertaintyReserveMinutes: null, totalMinutes: null },
      routing: {
        provider: mode === "network" ? "fossgis-osrm" : "none",
        profile: mode === "network" ? "foot" : null,
        mode,
        estimated: mode === "fallback",
        parameters: { walkingSpeedKmPerHour: 3, coordinateCount: 3, budgetPrefixApplied: false },
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

function predictionFor(riskFocus: "all" | "waste" | "cigaretteButts") {
  return {
    status: "unavailable" as const,
    source: "urban-pressure-model" as const,
    modelVersion: null,
    snapshot: null,
    riskFocus,
    zonesConsidered: 0,
    candidatesConsidered: 0,
    admitted: 0,
    admittedCandidateIds: [],
    passedToPlanner: 0,
    excludedByPreselection: 0,
    excludedByPlannerBudget: 0,
    excludedByFinalRoutingBudget: 0,
    preselectionExcludedCandidateIds: [],
    preselectionExclusionReasons: {},
    finalRoutingBudgetExcludedCandidateIds: [],
    selected: 0,
    selectedCandidateIds: [],
    excludedByCorridor: 0,
    deduplicated: 0,
    warnings: [],
  };
}

function multiGroupData(
  routeModes: readonly ["network" | "fallback", "network" | "fallback"] = ["network", "network"],
): RouteExplanationData {
  const data = dataFor("network");
  const baseSelection = data.trace.selectedStops[0]!;
  const plannerSelection = {
    ...baseSelection,
    id: "spot-1",
    reason: "Groupe 1 : sélection prédictive conservée.",
    selectionSource: "planner_selection" as const,
    eventContributions: [],
  };
  const observedSelection = {
    ...baseSelection,
    id: "spot-2",
    reason: "Groupe 2 : observation validée ajoutée après enrichissement.",
    selectionSource: "observed_enrichment" as const,
    combinedScore: null,
    normalizedScoreComponents: { priority: null, travel: null },
    eventContributions: [{
      eventId: "event-2",
      title: "Événement groupe 2",
      eventDate: "2026-08-20",
      locationLabel: "Place groupe 2",
      latitude: 48.861,
      longitude: 2.351,
      ageDays: 2,
      distanceKm: 0.4,
      recencyFactor: 0.8,
      proximityFactor: 0.9,
      attendanceFactor: 1,
      attendanceEvidence: { yes: 1, maybe: 0, capacityTarget: null, known: true },
      pressure: 0.4,
      scoreContribution: 0.2,
    }],
  };
  const secondPlannerSelection = {
    ...baseSelection,
    id: "spot-3",
    reason: "Groupe 2 : seconde sélection finale.",
    selectionSource: "planner_selection" as const,
    step: 2,
    eventContributions: [],
  };

  data.stops = [
    ...data.stops,
    { ...data.stops[0]!, id: "spot-2", label: "Observation enrichie", latitude: 48.861, longitude: 2.351 },
    { ...data.stops[0]!, id: "spot-3", label: "Second arrêt", latitude: 48.862, longitude: 2.352 },
  ];
  data.trace.selectedStops = [];
  Reflect.set(data.trace, "multiRoute", {
    groupCount: 2,
    volunteers: 3,
    groups: [
      { groupIndex: 1, volunteerCount: 1, candidateIds: ["spot-1"], reservedCandidateIds: [], distanceKm: 1, durationMinutes: 10, targetCount: 1, selectedStops: [plannerSelection], routeMode: routeModes[0], withinBudget: true },
      { groupIndex: 2, volunteerCount: 2, candidateIds: ["spot-2", "spot-3"], reservedCandidateIds: [], distanceKm: 2, durationMinutes: 20, targetCount: 2, selectedStops: [observedSelection, secondPlannerSelection], routeMode: routeModes[1], withinBudget: true },
    ],
    metrics: { coverageGain: 3, sharedTargetRatio: 0, sharedDistanceKm: 0, sharedDistanceRatio: 0, balanceDistance: 1, balanceDuration: 1, balanceTargetCount: 1, balanceVolunteerCount: 1, networkDistanceMeasured: true },
    constraints: [],
  });
  Reflect.set(data, "multiRoute", {
    totalDistanceKm: 3,
    coverageGain: 3,
    sharedTargetRatio: 0,
    sharedDistanceRatio: 0,
    balanceDistance: 1,
    balanceDuration: 1,
    balanceTargetCount: 1,
  });
  return data;
}

describe("RouteExplanation", () => {
  it("renders final stops and provenance from each multi-route group", () => {
    const markup = renderToStaticMarkup(<RouteExplanation data={multiGroupData()} fr />);

    expect(markup).toContain("Stops retenus");
    expect(markup).toContain(">3</dd>");
    expect(markup).toContain("Groupe 1 · arrêts finaux routés");
    expect(markup).toContain("Groupe 2 · arrêts finaux routés");
    expect(markup).toContain("Observation enrichie");
    expect(markup).toContain("Stop ajouté par enrichissement");
    expect(markup).toContain("Score final non calculé");
    expect(markup).toContain("Événement groupe 2");
    expect(markup).not.toContain("Aucun stop n’a été sélectionné par le moteur.");
  });

  it("keeps every event contribution attached to its routed stop and group", () => {
    const data = multiGroupData();
    const firstStop = data.trace.multiRoute!.groups[0]!.selectedStops[0]!;
    const secondStop = data.trace.multiRoute!.groups[1]!.selectedStops[0]!;
    const sharedContribution = secondStop.eventContributions[0]!;
    firstStop.eventContributions = [{ ...sharedContribution, distanceKm: 0.1, scoreContribution: 4.5 }];
    secondStop.eventContributions = [
      { ...sharedContribution, distanceKm: 0.8, scoreContribution: 1.25 },
      { ...sharedContribution, eventId: "event-3", title: "Second événement", scoreContribution: 2.75 },
    ];

    const markup = renderToStaticMarkup(<RouteExplanation data={data} fr />);

    expect(markup.match(/Événement groupe 2/g)).toHaveLength(2);
    expect(markup).toContain("Groupe 1 · Arrêt Place de test · Événement groupe 2 : contribution 4,5 points.");
    expect(markup).toContain("Groupe 2 · Arrêt Observation enrichie · Événement groupe 2 : contribution 1,25 points.");
    expect(markup).toContain("Second événement : contribution 2,75 points.");
    expect(markup).not.toContain("contribution 5,75 points");
  });

  it("renders grouped stops with valid nested ordered lists", () => {
    const markup = renderToStaticMarkup(<RouteExplanation data={multiGroupData()} fr />);

    expect(markup).toMatch(/<ol[^>]*><li[^>]*><h4[^>]*>Groupe 1 · arrêts finaux routés<\/h4><ol/);
    expect(markup).not.toMatch(/<ol[^>]*><h4[^>]*>Groupe/);
  });

  it.each([
    [["network", "network"], "Réseau intégral", "mesure réseau"],
    [["network", "fallback"], "Routage mixte : réseau + estimation", "mesure partielle"],
    [["fallback", "fallback"], "Estimation / fallback", "estimé"],
  ] as const)("qualifies aggregated metrics for %s group routing", (routeModes, routingLabel, metricLabel) => {
    const markup = renderToStaticMarkup(<RouteExplanation data={multiGroupData(routeModes)} fr />);
    const totalDistanceSummary = markup.match(/Distance totale<\/dt><dd[^>]*>(.*?)<\/dd>/)?.[1] ?? "";

    expect(markup).toContain(routingLabel);
    expect(totalDistanceSummary).toContain(metricLabel);
  });

  it("does not turn guided-only multi-route passages into selected stops", () => {
    const data = multiGroupData();
    const traceMultiRoute = data.trace.multiRoute!;
    traceMultiRoute.groups.forEach((group) => {
      group.selectedStops = [];
      group.plannedWaypoints = [{ id: "guided-only", label: "Passage guidé", latitude: 48.86, longitude: 2.35, order: 1 }];
    });
    const markup = renderToStaticMarkup(<RouteExplanation data={data} fr />);

    expect(markup).toContain(">0</dd>");
    expect(markup).toContain("Aucun stop n’a été sélectionné par le moteur.");
    expect(markup).not.toContain("Passage guidé");
  });

  it("uses the global trace as an explicit compatibility fallback", () => {
    const data = dataFor("network");
    Reflect.set(data.trace, "multiRoute", {
      groupCount: 2,
      groups: [{ groupIndex: 1, candidateIds: ["spot-1"], reservedCandidateIds: [], targetCount: 1 }],
      constraints: [],
    });
    Reflect.set(data, "multiRoute", {
      totalDistanceKm: 1,
      coverageGain: 1,
      sharedTargetRatio: 0,
      sharedDistanceRatio: 0,
      balanceDistance: 0,
      balanceDuration: 0,
      balanceTargetCount: 0,
    });
    const markup = renderToStaticMarkup(<RouteExplanation data={data} fr />);

    expect(markup).toContain("Étape 1: sélection dans le budget.");
    expect(markup).not.toContain("Aucun stop n’a été sélectionné par le moteur.");
  });

  it("exposes trace-backed selection and network street details", () => {
    const markup = renderToStaticMarkup(<RouteExplanation data={dataFor("network")} fr />);

    expect(markup).toContain("Comprendre cet itinéraire");
    expect(markup).toContain("Étape 1: sélection dans le budget.");
    expect(markup).toContain("Rue de Test");
    expect(markup).toContain("Mesure réseau");
    expect(markup).toContain("Boucle de 2,4 km · départ et arrivée au même endroit");
    expect(markup).not.toContain("Trajet ouvert");
    expect(markup).toContain("La durée d’action complète n’est pas encore fiable");
    expect(markup).toContain("retour réserve 16 min");
    expect(markup).toContain("Rue du Retour");
    expect(markup).toContain("<summary");
    expect(markup).toContain("Pollution probable : 0 %");
    expect(markup).toContain("contribution planner : 83,5 %");
    expect(markup).not.toContain("sur 100");
    expect(markup).toContain("pickupPreference");
    expect(markup).toContain("effectiveRiskFocus");
    expect(markup).toContain("prediction.riskFocus");
    expect(markup).toContain("Aucun type n’est explicitement favorisé dans les zones prédites.");
    expect(markup).toContain("La sécurité, la distance et l’utilité restent prises en compte.");
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
    Reflect.set(data.trace, "prediction", predictionFor("cigaretteButts"));
    const markup = renderToStaticMarkup(<RouteExplanation data={data} fr />);

    expect(markup).toContain("pickupPreference");
    expect(markup).toContain("cigarette_butts");
    expect(markup).toContain("effectiveRiskFocus");
    expect(markup).toContain("cigaretteButts");
    expect(markup).toContain("prediction.riskFocus");
    expect(markup).toContain("Le calcul privilégie le risque mégots des zones prédites.");
    expect(markup).toContain("Les signalements observés ne sont pas repondérés");
    expect(markup).toContain("leur scoring observé reste inchangé");
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

  it.each(["address", "map", "gps", "browser"] as const)("explains an explicit %s arrival without attributing it to the planner", (source) => {
    const data = dataFor("network");
    data.isLoop = false;
    data.routeTopology = "open";
    data.arrival = { latitude: 48.858, longitude: 2.354, source };
    data.loop.isLoop = false;
    const markup = renderToStaticMarkup(<RouteExplanation data={data} fr />);

    expect(markup).toContain("Trajet ouvert de 2,4 km");
    expect(markup).toContain("Fournie explicitement");
    expect(markup).toContain("Trajet ouvert de 2,4 km · départ fixé par la localisation, arrivée fournie explicitement.");
    expect(markup).not.toContain("arrivée choisie selon le parcours et le budget.");
    expect(markup).not.toContain("boucles coordonnées");
  });

  it("keeps the calculated-arrival explanation for a planner arrival", () => {
    const data = dataFor("network");
    data.isLoop = false;
    data.routeTopology = "open";
    data.arrival = { latitude: 48.858, longitude: 2.354, source: "planner" };
    data.loop.isLoop = false;
    const markup = renderToStaticMarkup(<RouteExplanation data={data} fr />);

    expect(markup).toContain("Déterminée par le planner");
    expect(markup).toContain("Trajet ouvert de 2,4 km · départ fixé par la localisation, arrivée choisie selon le parcours et le budget.");
    expect(markup).not.toContain("arrivée fournie explicitement.");
  });

  it("does not invent arrival provenance when an open route has no arrival", () => {
    const data = dataFor("network");
    data.isLoop = false;
    data.routeTopology = "open";
    data.arrival = undefined;
    data.loop.isLoop = false;
    const markup = renderToStaticMarkup(<RouteExplanation data={data} fr />);

    expect(markup).toContain("Non disponible");
    expect(markup).toContain("Trajet ouvert de 2,4 km · départ fixé par la localisation, arrivée non disponible.");
    expect(markup).not.toContain("arrivée choisie selon le parcours et le budget.");
    expect(markup).not.toContain("arrivée fournie explicitement.");
  });
});
