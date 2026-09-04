#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_OUTPUT = path.resolve("data/geospatial/paris-pressure-snapshot.json");

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function finite(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalise(values, logarithmic = false) {
  const prepared = values.map((value) =>
    value === null ? null : logarithmic ? Math.log1p(Math.max(0, value)) : value,
  );
  const known = prepared.filter((value) => value !== null);
  if (known.length === 0) return prepared.map(() => null);
  const min = Math.min(...known);
  const max = Math.max(...known);
  return prepared.map((value) =>
    value === null ? null : min === max ? 0.5 : clamp((value - min) / (max - min)),
  );
}

function parseCsv(file) {
  const lines = fs.readFileSync(path.resolve(file), "utf8").split(/\r?\n/);
  const header = lines.shift()?.split(";") ?? [];
  const index = new Map(header.map((name, position) => [name, position]));
  return lines.filter(Boolean).map((line) => {
    const values = line.split(";");
    return {
      iris: values[index.get("IRIS") ?? -1],
      population: finite(values[index.get("P21_POP") ?? -1]),
    };
  });
}

function ringAreaKm2(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  const origin = ring[0];
  let area = 0;
  for (let index = 1; index < ring.length - 1; index += 1) {
    const a = ring[index];
    const b = ring[index + 1];
    const ax = (a[0] - origin[0]) * 73;
    const ay = (a[1] - origin[1]) * 111;
    const bx = (b[0] - origin[0]) * 73;
    const by = (b[1] - origin[1]) * 111;
    area += (ax * by - bx * ay) / 2;
  }
  return Math.abs(area);
}

function geometryAreaKm2(geometry) {
  if (!geometry) return null;
  const rings = geometry.type === "Polygon"
    ? geometry.coordinates
    : geometry.type === "MultiPolygon"
      ? geometry.coordinates.flat()
      : [];
  const area = rings.reduce((sum, ring) => sum + ringAreaKm2(ring), 0);
  return area > 0 ? area : null;
}

function distanceKm(left, right) {
  const latitudeKm = (left.latitude - right.latitude) * 111;
  const longitudeKm = (left.longitude - right.longitude) * 73;
  return Math.sqrt(latitudeKm ** 2 + longitudeKm ** 2);
}

function nearestZone(zones, point) {
  return zones.reduce((best, zone) => {
    const distance = distanceKm(zone.centroid, point);
    return !best || distance < best.distance ||
      (distance === best.distance && zone.id < best.zone.id)
      ? { zone, distance }
      : best;
  }, null)?.zone ?? null;
}

function source(family, dataset, url, license, datasetVersion, geographicLevel, status, refreshedAt, notes = [], publisher = null, observedAt = null) {
  return {
    family,
    publisher: publisher ?? (family === "resident_population" ? "Insee" : "Ville de Paris / partenaires publics"),
    dataset,
    url,
    license,
    datasetVersion,
    observedAt,
    refreshedAt,
    geographicLevel,
    status,
    notes,
  };
}

export function buildSnapshot({ iris, populationRows, transportRows = [], activityRows = [], cleanlinessRows = [], tourismRows = [], refreshedAt = new Date().toISOString() }) {
  const populationByIris = new Map(populationRows.map((row) => [row.iris, row.population]));
  const zones = iris.results
    .filter((row) => row.dep === "75" && row.geo_point_2d)
    .map((row) => ({
      id: row.code_iris,
      label: row.nom_iris,
      geographicLevel: "iris",
      arrondissementCode: String(row.insee_com),
      centroid: { latitude: row.geo_point_2d.lat, longitude: row.geo_point_2d.lon },
      areaKm2: geometryAreaKm2(row.geo_shape?.geometry),
      residentPopulation: populationByIris.get(row.code_iris) ?? null,
      transportStationCount: null,
      transportAnnualEntrants: null,
      visitorAttendance: null,
      tourismPresenceProxy: null,
      authorisedTerraces: null,
      openAirMarkets: null,
      otherPlaces: null,
      cleanlinessPrior: null,
      cleanlinessRawObservations: null,
      cleanlinessResolution: null,
      cleanlinessMeasuredAt: null,
    }));

  for (const row of transportRows) {
    const point = { latitude: finite(row.latitude), longitude: finite(row.longitude) };
    if (point.latitude === null || point.longitude === null) continue;
    const zone = nearestZone(zones, point);
    if (!zone) continue;
    zone.transportStationCount = (zone.transportStationCount ?? 0) + 1;
    zone.transportAnnualEntrants = (zone.transportAnnualEntrants ?? 0) + Math.max(0, finite(row.trafic) ?? 0);
  }
  for (const row of activityRows) {
    const point = { latitude: finite(row.latitude), longitude: finite(row.longitude) };
    if (point.latitude === null || point.longitude === null) continue;
    const zone = nearestZone(zones, point);
    if (!zone) continue;
    if (row.kind === "terrace") zone.authorisedTerraces = (zone.authorisedTerraces ?? 0) + 1;
    if (row.kind === "market") zone.openAirMarkets = (zone.openAirMarkets ?? 0) + 1;
    if (row.kind === "other") zone.otherPlaces = (zone.otherPlaces ?? 0) + 1;
  }
  for (const row of tourismRows) {
    const point = { latitude: finite(row.latitude), longitude: finite(row.longitude) };
    if (point.latitude === null || point.longitude === null) continue;
    const zone = nearestZone(zones, point);
    if (!zone) continue;
    const attendance = finite(row.attendance);
    if (attendance !== null) {
      zone.visitorAttendance = (zone.visitorAttendance ?? 0) + attendance;
    }
    zone.tourismPresenceProxy = (zone.tourismPresenceProxy ?? 0) + 1;
  }

  const cleanlinessValues = normalise(cleanlinessRows.map((row) => finite(row.count)));
  for (const [index, row] of cleanlinessRows.entries()) {
    for (const zone of zones) {
      const arrondissement = String(row.arrondissement).padStart(2, "0");
      if (zone.arrondissementCode !== `751${arrondissement}`) continue;
      zone.cleanlinessPrior = cleanlinessValues[index] ?? null;
      zone.cleanlinessRawObservations = finite(row.count);
      zone.cleanlinessResolution = "arrondissement";
      zone.cleanlinessMeasuredAt = row.measuredAt ?? null;
    }
  }

  const populationSignal = normalise(zones.map((zone) =>
    zone.residentPopulation === null || !zone.areaKm2 || zone.areaKm2 <= 0
      ? null
      : zone.residentPopulation / zone.areaKm2,
  ), true);
  const transportSignal = normalise(zones.map((zone) => zone.transportAnnualEntrants), true);
  const tourismSignal = normalise(zones.map((zone) =>
    zone.visitorAttendance !== null && zone.visitorAttendance !== undefined
      ? zone.visitorAttendance
      : zone.tourismPresenceProxy,
  ));
  const activitySignal = normalise(zones.map((zone) => {
    const values = [zone.authorisedTerraces, zone.openAirMarkets, zone.otherPlaces];
    return values.every((value) => value === null)
      ? null
      : values.reduce((sum, value) => sum + (value ?? 0), 0);
  }), true);
  const finalZones = zones.map((zone, index) => {
    const resident = populationSignal[index];
    const transport = transportSignal[index];
    const tourism = tourismSignal[index];
    const activity = activitySignal[index];
    const known = [[resident, 0.35], [transport, 0.25], [tourism, 0.25], [activity, 0.15]]
      .filter(([value]) => value !== null);
    const weight = known.reduce((sum, [, itemWeight]) => sum + itemWeight, 0);
    const humanPressure = weight === 0
      ? null
      : known.reduce((sum, [value, itemWeight]) => sum + value * itemWeight, 0) / weight;
    return {
      id: zone.id,
      label: zone.label,
      geographicLevel: zone.geographicLevel,
      arrondissementCode: zone.arrondissementCode,
      centroid: zone.centroid,
      areaKm2: zone.areaKm2,
      signals: {
        residentPopulation: { population: zone.residentPopulation, densityPerKm2: zone.areaKm2 && zone.residentPopulation !== null ? zone.residentPopulation / zone.areaKm2 : null, normalized: resident },
        transport: { stationCount: zone.transportStationCount, annualEntrants: zone.transportAnnualEntrants, normalized: transport },
        tourism: { visitorAttendance: zone.visitorAttendance, tourismPresenceProxy: zone.tourismPresenceProxy, normalized: tourism },
        publicActivity: { authorisedTerraces: zone.authorisedTerraces, openAirMarkets: zone.openAirMarkets, otherPlaces: zone.otherPlaces, normalized: activity },
        cleanlinessPrior: { normalized: zone.cleanlinessPrior, rawObservations: zone.cleanlinessRawObservations, resolution: zone.cleanlinessResolution, measuredAt: zone.cleanlinessMeasuredAt },
      },
      humanPressure: humanPressure === null ? null : clamp(humanPressure),
    };
  }).sort((left, right) => left.id.localeCompare(right.id));

  const now = refreshedAt;
  return {
    schemaVersion: "paris-pressure-v1",
    snapshotId: "paris-iris-2024-pop-2021-r1",
    generatedAt: now,
    refreshedAt: now,
    geographicLevel: "iris",
    coverage: {
      country: "FR",
      department: "75",
      commune: "75056",
      zoneCount: finalZones.length,
      complete: finalZones.length === 992,
      notes: [
        "Population et densité à l'IRIS ; les signaux non renseignés restent null.",
        "Les rattachements ponctuels sont effectués au centroïde IRIS et sont signalés comme approximation de jointure.",
        "Couverture géométrique IRIS complète ; la disponibilité des signaux reste partielle et est portée par chaque source.",
      ],
    },
    sources: [
      source("geography", "Contours IRIS Paris", "https://data.iledefrance.fr/explore/dataset/iris/", "Licence Ouverte Etalab", "géographie 2024", "iris", "available", now, ["Référentiel géographique IGN/OpenData Île-de-France ; 992 IRIS du département 75."]),
      source("resident_population", "Population en 2021 - Base infracommunale IRIS", "https://www.insee.fr/fr/statistiques/8268806", "Licence ouverte Etalab", "2021 / géographie 2023", "iris", "available", now, [], "Insee", "2021"),
      source("transport", "Trafic annuel entrant par station du réseau ferré 2021", "https://data.ratp.fr/explore/dataset/trafic-annuel-entrant-par-station-du-reseau-ferre-2021/", "Licence Ouverte Etalab", "2021", "iris", transportRows.length ? "partial" : "unavailable", now, transportRows.length ? ["Rattachement station→IRIS par centroïde ; indicateur annuel, non temps réel."] : ["La source annuelle est cataloguée mais aucun export station géolocalisé n'a été fourni à ce rafraîchissement."], "RATP / Île-de-France Mobilités", "2021"),
      source(
        "tourism",
        tourismRows.length ? "OpenStreetMap tourism points" : "Fréquentation des monuments nationaux",
        tourismRows.length ? "https://www.openstreetmap.org/" : "https://data.culture.gouv.fr/explore/dataset/frequentation-des-monuments-nationaux/",
        tourismRows.length ? "ODbL" : "Licence ouverte Etalab",
        tourismRows.length ? "snapshot OSM 2026-09-04" : "millésime variable",
        "iris",
        tourismRows.length ? "partial" : "unavailable",
        now,
        tourismRows.length
          ? ["Proxy de présence touristique géolocalisé ; aucune fréquentation mesurée n'est inventée.", "Attribution OpenStreetMap sous ODbL."]
          : ["La fréquentation n'est conservée que lorsqu'un point géolocalisé est fourni."],
        tourismRows.length ? "OpenStreetMap contributors" : "Ministère de la Culture",
        tourismRows.length ? "2026-09-04" : null
      ),
      source("public_activity", "Terrasses et étalages : Autorisations / Marchés découverts", "https://opendata.paris.fr/", "Licence Ouverte Etalab", "rafraîchissement source", "iris", activityRows.length ? "partial" : "unavailable", now, ["Les objets géolocalisés sont agrégés à l'IRIS le plus proche."]),
      source("cleanliness", "Dans Ma Rue - Anomalies signalées", "https://opendata.paris.fr/explore/dataset/dans-ma-rue/", "Licence Ouverte Etalab", "fenêtre publiée source", "arrondissement", cleanlinessRows.length ? "partial" : "unavailable", now, ["Signal de malpropreté indépendant du revenu ; lorsqu'il est agrégé à l'arrondissement, la résolution reste explicitement faible."], null, "2025+")
    ],
    zones: finalZones,
  };
}

function main() {
  const irisFile = argument("--iris-json");
  const populationFile = argument("--population-csv");
  const output = argument("--output", DEFAULT_OUTPUT);
  if (!irisFile || !populationFile) {
    console.error("Usage: refresh-paris-pressure-snapshot.mjs --iris-json <file> --population-csv <file> [--transport-json <file>] [--activity-json <file>] [--cleanliness-json <file>] [--tourism-json <file>] [--output <file>]");
    process.exitCode = 2;
    return;
  }
  const snapshot = buildSnapshot({
    iris: readJson(irisFile),
    populationRows: parseCsv(populationFile),
    transportRows: argument("--transport-json") ? readJson(argument("--transport-json")) : [],
    activityRows: argument("--activity-json") ? readJson(argument("--activity-json")) : [],
    cleanlinessRows: argument("--cleanliness-json") ? readJson(argument("--cleanliness-json")) : [],
    tourismRows: argument("--tourism-json") ? readJson(argument("--tourism-json")) : [],
    refreshedAt: argument("--refreshed-at") ?? undefined,
  });
  const outputPath = path.resolve(output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Paris pressure snapshot written: ${outputPath} (${snapshot.coverage.zoneCount} zones)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
