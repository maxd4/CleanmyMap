import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  formatMissionDistance,
  formatMissionDuration,
  formatMissionTimestamp,
  getMissionStatusLabel,
} from "./mission-page-contract";

const missionPageSource = readFileSync(
  new URL("../../app/(app)/missions/[id]/page.tsx", import.meta.url),
  "utf8",
);
const missionMapSource = readFileSync(new URL("./mission-map.tsx", import.meta.url), "utf8");

describe("mission page contract", () => {
  it("mappe les quatre statuts persistés sans transformer cancelled en mission planifiée", () => {
    expect(getMissionStatusLabel("pending")).toBe("Mission planifiée");
    expect(getMissionStatusLabel("tracking")).toBe("Action en cours");
    expect(getMissionStatusLabel("completed")).toBe("Mission terminée");
    expect(getMissionStatusLabel("cancelled")).toBe("Mission annulée");
  });

  it("formate exclusivement la distance, la durée et les dates réellement portées", () => {
    expect(formatMissionDistance(2450)).toBe("2.5 km");
    expect(formatMissionDistance(null)).toBe("Non disponible");
    expect(formatMissionDuration(3600)).toBe("60 min");
    expect(formatMissionDuration(null)).toBe("Non disponible");
    expect(formatMissionTimestamp(null)).toBe("Non enregistrée");
    expect(formatMissionTimestamp("2026-05-06T12:00:00.000Z")).toContain("2026");
  });

  it("ne contient aucun fallback, calcul environnemental ou partage factice", () => {
    expect(missionPageSource).toContain("notFound();");
    expect(missionPageSource).toContain("if (missionResult.error)");
    expect(missionPageSource).toContain("if (pointsResult.error)");
    expect(missionPageSource).toContain("<DeferredMissionMap points={points} />");
    expect(missionPageSource).not.toContain("FALLBACK_STARTED_AT");
    expect(missionPageSource).not.toContain("Nettoyage Canal Saint-Martin");
    expect(missionPageSource).not.toContain("mockPoints");
    expect(missionPageSource).not.toContain("mission_actions");
    expect(missionPageSource).not.toContain("CO2");
    expect(missionPageSource).not.toContain("Eau préservée");
    expect(missionPageSource).not.toContain("Impact Certifié");
    expect(missionPageSource).not.toContain("Tracé GPS Certifié");
    expect(missionPageSource.toLowerCase()).not.toContain("authenticité");
    expect(missionPageSource).not.toContain("Partager l’impact");
  });

  it("rend l’absence de GPS comme un état vide réel", () => {
    expect(missionMapSource).toContain("Aucun tracé enregistré");
    expect(missionMapSource).not.toContain("Aucun tracé GPS disponible");
  });
});
