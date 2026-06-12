import { describe, expect, it } from "vitest";

import pageFamiliesManifest from "@/lib/ui/page-families/page-families.manifest.json";
import { PAGE_FAMILIES } from "@/lib/ui/page-families/families/registry";
import type { PageFamilyId } from "@/lib/ui/page-families/types";

type PageFamilyManifestEntry = {
  runtimeId: PageFamilyId;
  label: string;
  backdropToneKey: (typeof pageFamiliesManifest)[number]["backdropToneKey"];
};

describe("page-families manifest", () => {
  it("matches the runtime family registry for core families", () => {
    const families = pageFamiliesManifest as PageFamilyManifestEntry[];

    for (const family of families) {
      const runtimeFamily = PAGE_FAMILIES[family.runtimeId];

      expect(runtimeFamily).toBeDefined();
      expect(runtimeFamily.id).toBe(family.runtimeId);
      expect(runtimeFamily.label).toBe(family.label);
      expect(runtimeFamily.backdropToneKey).toBe(family.backdropToneKey);
    }
  });
});
