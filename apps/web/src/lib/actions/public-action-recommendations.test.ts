import { describe, expect, it } from "vitest";
import type { ActionRow } from "@/types/database";
import { publicAction } from "@/fixtures/public-action";
import {
  derivePublicActionRecommendations,
  getPublicActionRecommendationReadScope,
  resolveCanonicalPublicActionTerritory,
} from "./public-action-recommendations";
import { ALL_NEIGHBORHOODS } from "@/lib/geo/paris-neighborhood";

const now = new Date("2026-10-31T09:00:00.000Z");

function row(overrides: Partial<ActionRow>): ActionRow {
  return {
    ...publicAction,
    department_code: "75",
    department_name: "Paris",
    ...overrides,
  } as ActionRow;
}

function futureCandidate(id: string, overrides: Partial<ActionRow> = {}): ActionRow {
  return row({
    id,
    action_date: "2026-11-03",
    event_start_time: "10:00",
    location_label: "11e arrondissement",
    action_phase: "pre_action",
    ...overrides,
  });
}

describe("public action recommendations", () => {
  it("uses only an exact canonical zone and preserves department disambiguation", () => {
    expect(resolveCanonicalPublicActionTerritory(row({ location_label: "11e arrondissement" }))).toEqual({
      key: "zone:75:11e arrondissement",
      label: "11e arrondissement",
      kind: "zone",
    });
    expect(resolveCanonicalPublicActionTerritory(row({ location_label: "Berges de Seine", department_code: null }))).toBeNull();
    expect(resolveCanonicalPublicActionTerritory(row({ location_label: "Montreuil", department_code: "75" }))).toEqual({
      key: "department:75",
      label: "Paris",
      kind: "department",
    });

    const normalizedZone = row({ location_label: " １１E   ARRONDISSEMENT " });
    expect(resolveCanonicalPublicActionTerritory(normalizedZone)).toEqual({
      key: "zone:75:11e arrondissement",
      label: "11e arrondissement",
      kind: "zone",
    });
    expect(getPublicActionRecommendationReadScope(normalizedZone)).toMatchObject({
      locationLabelPattern: expect.stringMatching(/\[1１\]\[1１\]/u),
    });
  });

  it("keeps precomposed and decomposed accents in the bounded SQL scope", () => {
    const source = row({
      location_label: "Le Pré-Saint-Gervais",
      department_code: "93",
      department_name: "Seine-Saint-Denis",
    });
    const scope = getPublicActionRecommendationReadScope(source);

    expect(scope).toMatchObject({ locationLabelPattern: expect.any(String) });
    const pattern = (scope as { locationLabelPattern: string }).locationLabelPattern;
    expect(pattern).toContain("[pｐ][rｒ]é");
    expect(pattern).toContain("[pｐ][rｒ][eｅ]́");
    expect(pattern).not.toContain("secteur libre");
    expect(resolveCanonicalPublicActionTerritory(row({
      location_label: "Le Pre\u0301-Saint-Gervais",
      department_code: "93",
      department_name: "Seine-Saint-Denis",
    }))).toEqual({
      key: "zone:93:le pré-saint-gervais",
      label: "Le Pré-Saint-Gervais",
      kind: "zone",
    });
  });

  it("ranks the same zone before known neighbors, then date, time and id", () => {
    const source = row({
      id: "source",
      action_date: "2026-10-01",
      location_label: "11e arrondissement",
      action_phase: "post_action_complete",
    });
    const recommendations = derivePublicActionRecommendations(source, [
      futureCandidate("neighbor-late", { location_label: "12e arrondissement", action_date: "2026-11-01", event_start_time: "09:00" }),
      futureCandidate("same-late", { action_date: "2026-11-02", event_start_time: "09:00" }),
      futureCandidate("same-early", { action_date: "2026-11-01", event_start_time: "11:00" }),
      futureCandidate("neighbor-early", { location_label: "12e arrondissement", action_date: "2026-11-01", event_start_time: "08:00" }),
      futureCandidate("same-id-b", { action_date: "2026-11-01", event_start_time: "11:00" }),
      futureCandidate("same-id-a", { action_date: "2026-11-01", event_start_time: "11:00" }),
    ], now);

    expect(recommendations.map((item) => item.id)).toEqual([
      "same-early",
      "same-id-a",
      "same-id-b",
    ]);

    const normalizedCandidate = derivePublicActionRecommendations(source, [
      futureCandidate("normalized", { location_label: " １１Ｅ   ＡＲＲＯＮＤＩＳＳＥＭＥＮＴ " }),
    ], now);
    expect(normalizedCandidate.map((item) => item.id)).toEqual(["normalized"]);

    const crossDepartment = derivePublicActionRecommendations(
      row({ id: "source-cross", action_date: "2026-10-01", location_label: "16e arrondissement", action_phase: "post_action_complete" }),
      [futureCandidate("neighbor-cross", { location_label: "Neuilly-sur-Seine", department_code: "92", department_name: "Hauts-de-Seine" })],
      now,
    );
    expect(ALL_NEIGHBORHOODS.some((zone) => zone.name === "Neuilly-sur-Seine")).toBe(true);
    expect(crossDepartment.map((item) => item.id)).toEqual(["neighbor-cross"]);

    const decomposedAccent = derivePublicActionRecommendations(
      row({
        id: "source-pre-gervais",
        action_date: "2026-10-01",
        location_label: "Le Pré-Saint-Gervais",
        department_code: "93",
        department_name: "Seine-Saint-Denis",
        action_phase: "post_action_complete",
      }),
      [futureCandidate("decomposed-pre-gervais", {
        location_label: "Le Pre\u0301-Saint-Gervais",
        department_code: "93",
        department_name: "Seine-Saint-Denis",
      })],
      now,
    );
    expect(decomposedAccent.map((item) => item.id)).toEqual(["decomposed-pre-gervais"]);
  });

  it("excludes source, unknown territories, and every non-public or non-future state", () => {
    const source = row({
      id: "source",
      action_date: "2026-10-01",
      location_label: "11e arrondissement",
      action_phase: "post_action_complete",
    });
    const valid = futureCandidate("valid");
    const results = derivePublicActionRecommendations(source, [
      source,
      valid,
      futureCandidate("unknown", { location_label: "Berges de Seine", department_code: null, department_name: null }),
      futureCandidate("free-label", { location_label: " 11e arrondissement - secteur libre " }),
      futureCandidate("ambiguous-zone", { location_label: "Montreuil", department_code: "75", department_name: "Paris" }),
      futureCandidate("hidden", { moderation_visibility: "hidden" }),
      futureCandidate("draft", { review_state: "draft" }),
      futureCandidate("private", { access_mode: "invite_link" }),
      futureCandidate("past", { action_date: "2026-10-01" }),
      futureCandidate("started", { action_date: "2026-10-31", event_start_time: "08:00" }),
      futureCandidate("completed", { action_phase: "post_action_complete" }),
    ], now);

    expect(results.map((item) => item.id)).toEqual(["valid"]);
  });

  it("returns no arbitrary recommendation when the source territory is unknown", () => {
    const source = row({
      id: "source",
      action_date: "2026-10-01",
      location_label: "Berges de Seine",
      department_code: null,
      department_name: null,
      action_phase: "post_action_complete",
    });
    expect(derivePublicActionRecommendations(source, [futureCandidate("future")], now)).toEqual([]);
  });
});
