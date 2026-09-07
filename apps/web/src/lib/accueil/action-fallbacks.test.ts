import { describe, expect, it } from "vitest";
import {
  buildActionDataContract,
  type BuildActionContractParams,
} from "@/lib/actions/data-contract";
import manifest from "../../../public/images/action-fallbacks/action-fallback-images.json";
import {
  getActionFallbackContext,
  selectActionFallback,
} from "./action-fallbacks";
import { buildHomeCommunityActivity } from "./data";

function makeContract(
  id: string,
  overrides: Partial<
    Omit<
      BuildActionContractParams,
      "id" | "type" | "status" | "source" | "observedAt"
    >
  > = {},
) {
  return buildActionDataContract({
    id,
    type: "action",
    status: "approved",
    source: "actions",
    observedAt: "2026-08-27",
    createdAt: "2026-08-27T10:00:00.000Z",
    locationLabel: "Lieu sans contexte",
    latitude: 48.85,
    longitude: 2.35,
    actorName: "Bénévole",
    wasteKg: 2,
    cigaretteButts: 100,
    volunteersCount: 3,
    ...overrides,
  });
}

describe("action fallback images", () => {
  it("gives a user-provided photo priority over any fallback", () => {
    const contract = makeContract("with-user-photo", {
      photos: [
        {
          id: "photo-1",
          name: "ramassage.jpg",
          mimeType: "image/jpeg",
          size: 123,
          width: 1200,
          height: 800,
          dataUrl: "data:image/jpeg;base64,real-photo",
        },
      ],
    });

    const activity = buildHomeCommunityActivity([contract], "2026-01-01");

    expect(activity.items[0]?.image).toEqual({
      source: "userProvidedImage",
      url: "data:image/jpeg;base64,real-photo",
      alt: "Photo fournie par l'utilisateur pour Action de dépollution",
      isFallback: false,
    });
  });

  it("selects a stable compatible fallback for an urban action", () => {
    const contract = makeContract("urban-action", {
      locationLabel: "Paris 12e",
      placeType: "N° Rue/Allée/Villa/Ruelle/Impasse",
    });

    const first = selectActionFallback(contract);
    const second = selectActionFallback(contract);

    expect(first).toEqual(second);
    expect(first?.compatibleEnvironments).toContain("urban");
    expect(first?.environment).not.toBe("beach");
    expect(first?.environment).not.toBe("forest");
    expect(first?.isNeutral).toBe(false);
    expect(first?.publicPath).toMatch(/^\/images\/action-fallbacks\//);
  });

  it("uses the most specific compatible environment for forest and water contexts", () => {
    const forestAction = makeContract("forest-action", {
      placeType: "Forêt",
    });
    const lakeAction = makeContract("lake-action", {
      placeType: "Lac",
    });

    expect(getActionFallbackContext(forestAction).environment).toBe("forest");
    expect(selectActionFallback(forestAction)?.environment).toBe("forest");
    expect(getActionFallbackContext(lakeAction).environment).toBe("lake");
    expect(selectActionFallback(lakeAction)?.waterContext).toBe(true);
  });

  it("filters by action kind when the canonical objective is relevant", () => {
    const sortingAction = makeContract("sorting-action", {
      placeType: "Bois/Parc/Jardin/Square/Sentier",
      preparationData: {
        plannedObjective: "sensibilisation",
      },
    });

    expect(getActionFallbackContext(sortingAction).actionKind).toBe("sorting");
    expect(selectActionFallback(sortingAction)?.actionKinds).toContain("sorting");
  });

  it("keeps an unknown context on a neutral fallback", () => {
    const contract = makeContract("unknown-context");
    const fallback = selectActionFallback(contract);
    const activity = buildHomeCommunityActivity([contract], "2026-01-01");

    expect(fallback?.isNeutral).toBe(true);
    expect(fallback?.syntheticImage).toBe(true);
    expect(fallback?.mustNeverBePresentedAsFieldEvidence).toBe(true);
    expect(fallback?.publicPath).not.toContain("action-photos");
    expect(fallback?.alt).toBe(
      manifest.assets.find((asset) => asset.id === fallback?.id)?.alt,
    );
    expect(activity.items[0]?.image.isFallback).toBe(true);
    expect(contract.metadata.photos).toBeNull();
  });
});
