import { describe, expect, it } from "vitest";
import {
  getDefaultBundleId,
  getDefaultTargetId,
  getOrderedActionDeclarationExportBundles,
  getOrderedActionDeclarationExportTargets,
  resolveActionDeclarationExportTarget,
} from "./action-declaration-export-picker.model";
import {
  getActionDeclarationExportBundles,
  getActionDeclarationExportTargets,
} from "@/lib/actions/exports/export-form-media";

describe("action declaration export picker model", () => {
  const bundles = getActionDeclarationExportBundles();
  const targets = getActionDeclarationExportTargets();

  it("keeps mobile and desktop defaults aligned with the responsive contract", () => {
    expect(getDefaultBundleId(true)).toBe("social");
    expect(getDefaultTargetId(true)).toBe("story-instagram");
    expect(getDefaultBundleId(false)).toBe("terrain");
    expect(getDefaultTargetId(false)).toBe("pdf");
  });

  it("orders bundles according to the viewport", () => {
    expect(getOrderedActionDeclarationExportBundles(bundles, true).map((bundle) => bundle.id)).toEqual([
      "social",
      "terrain",
      "institutionnel",
      "rapport",
    ]);
    expect(getOrderedActionDeclarationExportBundles(bundles, false).map((bundle) => bundle.id)).toEqual([
      "terrain",
      "rapport",
      "institutionnel",
      "social",
    ]);
  });

  it("places recommended targets first without mutating the source targets", () => {
    const sourceIds = targets.map((target) => target.id);
    const orderedTargets = getOrderedActionDeclarationExportTargets(targets, bundles[1]!);

    expect(orderedTargets.map((target) => target.id)).toEqual([
      "story-instagram",
      "png",
      "publication-facebook",
      "publication-x",
      "pdf",
    ]);
    expect(targets.map((target) => target.id)).toEqual(sourceIds);
  });

  it("falls back to the first available target when the selected id disappears", () => {
    const orderedTargets = getOrderedActionDeclarationExportTargets(targets, bundles[0]!);

    expect(
      resolveActionDeclarationExportTarget(orderedTargets, "publication-x", targets)?.id,
    ).toBe("publication-x");
    expect(
      resolveActionDeclarationExportTarget(orderedTargets, "unknown" as never, targets)?.id,
    ).toBe("pdf");
  });
});
