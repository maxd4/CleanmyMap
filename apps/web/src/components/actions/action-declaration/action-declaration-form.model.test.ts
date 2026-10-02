import { describe, expect, it } from "vitest";
import type { ActionDrawing } from "@/lib/actions/types";
import { createInitialFormState, OTHER_VOLUNTEER_ASSOCIATION_VALUE } from "./payload";
import {
  getActionDeclarationDisclosureAttention,
  getActionDeclarationDisclosureSummaries,
} from "./action-declaration-form.model";

const drawing: ActionDrawing = {
  kind: "polyline",
  coordinates: [[48.85, 2.35], [48.86, 2.36]],
};

describe("action declaration presentation model", () => {
  it("summarizes empty, populated, and geometry sections without changing form data", () => {
    const form = createInitialFormState("Alice");
    expect(getActionDeclarationDisclosureSummaries({
      form,
      photoAssets: [],
      visionEstimate: null,
      manualDrawing: null,
    })).toMatchObject({ organization: "", collection: undefined, photo: undefined, route: undefined, time: undefined });

    form.participantAccounts = ["one", "two"];
    form.wasteCategories = ["plastic", "glass"];
    form.eventStartTime = "09:00";
    form.eventEndTime = "11:00";
    form.gpxImport = {
      source: "gpx_import",
      observedDistanceKm: 2,
      pointCount: 2,
      inferredTopology: "loop",
    };

    expect(getActionDeclarationDisclosureSummaries({
      form,
      photoAssets: [{ id: "photo-1", fileName: "photo.jpg", status: "ready" } as never],
      visionEstimate: null,
      manualDrawing: drawing,
    })).toEqual({
      organization: "2 participants",
      collection: "2 catégories de déchets",
      photo: "1 photo",
      route: "GPX importé",
      time: "09:00–11:00",
    });
  });

  it("opens the sections that contain validation or required boundary cases", () => {
    const form = createInitialFormState("Alice");
    form.routeTopology = "point_to_point";
    form.associationName = OTHER_VOLUNTEER_ASSOCIATION_VALUE;
    form.actorName = "";

    expect(getActionDeclarationDisclosureAttention({ form, validationIssues: [] })).toEqual({
      organization: true,
      collection: false,
      route: true,
      time: false,
    });

    expect(getActionDeclarationDisclosureAttention({
      form,
      validationIssues: [{ field: "wasteKg", message: "required" }],
    }).collection).toBe(true);
  });
});
