import { describe, expect, it } from "vitest";
import { applyActionEventPrefill } from "./action-event-prefill";

describe("applyActionEventPrefill", () => {
  it("copies only the reliable event location fields into the action form", () => {
    const form = applyActionEventPrefill(
      {
        locationLabel: "",
        departureLocationLabel: "",
        latitude: "",
        longitude: "",
        actionTitle: "",
        actionDate: "2026-09-04",
      },
      {
        locationLabel: "Place de test",
        latitude: 48.8566,
        longitude: 2.3522,
      },
    );

    expect(form).toEqual({
      locationLabel: "Place de test",
      departureLocationLabel: "Place de test",
      latitude: "48.8566",
      longitude: "2.3522",
      actionTitle: "",
      actionDate: "2026-09-04",
    });
  });

  it("keeps the original form when no reliable event prefill exists", () => {
    const form = {
      locationLabel: "Lieu saisi",
      departureLocationLabel: "Départ saisi",
      latitude: "48.8",
      longitude: "2.3",
    };

    expect(applyActionEventPrefill(form, undefined)).toBe(form);
  });
});
