import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import {
  buildTrashSpotterActionableCandidates,
  classifyTrashSpotterSafety,
  isTrashSpotterActionableItem,
  isTrashSpotterSpotRecord,
  toTrashSpotterActionableCandidate,
} from "./trash-spotter-actionable-candidates";
import { toActionMapItem } from "./contract-mappers";

function buildContract(
  overrides: Partial<Parameters<typeof buildActionDataContract>[0]> = {},
) {
  return buildActionDataContract({
    id: "spot-1",
    type: "spot",
    status: "approved",
    source: "trash_spotter_spots",
    sourceStatus: "validated",
    observedAt: "2026-08-20T10:00:00.000Z",
    locationLabel: "Quai de test",
    latitude: 48.8566,
    longitude: 2.3522,
    wasteCategories: ["plastic"],
    ...overrides,
  });
}

describe("Trash Spotter actionable candidates", () => {
  it("accepts only a validated canonical spot with valid coordinates", () => {
    const candidate = toTrashSpotterActionableCandidate(buildContract());

    expect(candidate).toMatchObject({
      id: "spot-1",
      label: "Quai de test",
      latitude: 48.8566,
      longitude: 2.3522,
      observedAt: "2026-08-20",
      wasteCategories: ["plastic"],
      source: "trash_spotter_spots",
      sourceStatus: "validated",
      safety: {
        volunteerEligibility: "eligible",
        specializationReason: null,
      },
    });
  });

  it.each([
    ["new", "pending"],
    ["cleaned", "approved"],
  ] as const)("excludes canonical %s records", (sourceStatus, status) => {
    expect(
      toTrashSpotterActionableCandidate(
        buildContract({ sourceStatus, status }),
      ),
    ).toBeNull();
  });

  it("excludes clean_place, non-canonical sources and invalid coordinates", () => {
    expect(
      toTrashSpotterActionableCandidate(
        buildContract({ type: "clean_place" }),
      ),
    ).toBeNull();
    expect(
      toTrashSpotterActionableCandidate(buildContract({ source: "spots" })),
    ).toBeNull();
    expect(
      toTrashSpotterActionableCandidate(buildContract({ latitude: null })),
    ).toBeNull();
  });

  it.each([
    ["plastic", "eligible", null],
    ["cigarette_butt", "eligible", null],
    ["broken_glass", "specialized_required", "trained_only"],
    ["sharps", "specialized_required", "no_pickup"],
  ] as const)(
    "classifies %s according to pickup policy",
    (category, volunteerEligibility, specializationReason) => {
      expect(classifyTrashSpotterSafety([category])).toEqual({
        volunteerEligibility,
        specializationReason,
      });
    },
  );

  it("treats missing categories conservatively without inventing safety", () => {
    expect(classifyTrashSpotterSafety(null)).toEqual({
      volunteerEligibility: "specialized_required",
      specializationReason: "missing_categories",
    });
    expect(
      toTrashSpotterActionableCandidate(buildContract({ wasteCategories: null }))
        ?.safety,
    ).toEqual({
      volunteerEligibility: "specialized_required",
      specializationReason: "missing_categories",
    });
  });

  it("uses the same predicate for map items and keeps distinct IDs", () => {
    const first = toActionMapItem(buildContract({ id: "spot-a" }));
    const second = toActionMapItem(buildContract({ id: "spot-b" }));

    expect(isTrashSpotterActionableItem(first)).toBe(true);
    expect(buildTrashSpotterActionableCandidates([first, second])).toHaveLength(2);
  });

  it("keeps every canonical spot status out of the generic map layer", () => {
    const pending = toActionMapItem(
      buildContract({ status: "pending", sourceStatus: "new" }),
    );
    const cleaned = toActionMapItem(
      buildContract({ status: "approved", sourceStatus: "cleaned" }),
    );
    const cleanPlace = toActionMapItem(
      buildContract({ type: "clean_place", sourceStatus: "validated" }),
    );

    expect(isTrashSpotterSpotRecord(pending)).toBe(true);
    expect(isTrashSpotterSpotRecord(cleaned)).toBe(true);
    expect(isTrashSpotterSpotRecord(cleanPlace)).toBe(false);
  });
});
