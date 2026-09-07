export const availableSourceHealth = {
  partial: false,
  failedSources: [],
  availableSources: ["spots"],
  warnings: [],
};

export const candidate = {
  id: "spot-1",
  label: "Paris 4e",
  latitude: 48.85,
  longitude: 2.35,
  score: 80,
  reason: "Signalement récent",
};

export const fallbackGeometry = (
  coordinates: [number, number][] = [],
  durationMinutes = 0,
) => ({
  isLoop: coordinates.length >= 2 && coordinates[0]?.[0] === coordinates.at(-1)?.[0] && coordinates[0]?.[1] === coordinates.at(-1)?.[1],
  origin: coordinates[0] ?? null,
  returnLeg: coordinates.length >= 2 && coordinates[0]?.[0] === coordinates.at(-1)?.[0] && coordinates[0]?.[1] === coordinates.at(-1)?.[1]
    ? { fromStopIndex: coordinates.length - 2, toStopIndex: coordinates.length - 1, distanceKm: 0, estimatedMinutes: 0 }
    : null,
  coordinates,
  distanceKm: 1,
  durationMinutes,
  legs: [],
  provider: "none" as const,
  profile: null,
  mode: "fallback" as const,
  estimated: true,
});

export function request(payload: unknown = {}) {
  return new Request("http://localhost/api/route/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function plannedStop(candidateValue = candidate, index = 0) {
  return {
    candidate: candidateValue,
    incrementalDistanceKm: index + 1,
    incrementalTravelMinutes: index + 5,
    cumulativeTravelMinutes: (index + 1) * 5,
    returnDistanceKm: index + 1,
    returnTravelMinutes: index + 5,
    loopDistanceKm: (index + 1) * 2,
    loopTravelMinutes: (index + 1) * 10,
  };
}
