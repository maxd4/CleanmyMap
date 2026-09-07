import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type ManifestAsset = {
  id: string;
  file: string;
  publicPath: string;
  sha256: string;
};

type FallbackManifest = {
  publicUrlPrefix: string;
  assets: ManifestAsset[];
};

const actionFallbackDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../public/images/action-fallbacks",
);
const manifestPath = path.join(
  actionFallbackDirectory,
  "action-fallback-images.json",
);
const manifest = JSON.parse(
  readFileSync(manifestPath, "utf8"),
) as FallbackManifest;

function getCanonicalPngFiles(): string[] {
  return readdirSync(actionFallbackDirectory, { withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"),
    )
    .map((entry) => entry.name)
    .sort();
}

function assertUnique(values: string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

describe("action fallback manifest integrity", () => {
  it("keeps the manifest and the 15 canonical PNG assets in exact agreement", () => {
    const canonicalFiles = getCanonicalPngFiles();
    const manifestFiles = manifest.assets.map((asset) => asset.file).sort();

    expect(manifest.publicUrlPrefix).toBe("/images/action-fallbacks/");
    expect(manifest.assets).toHaveLength(15);
    expect(canonicalFiles).toHaveLength(15);
    expect(manifestFiles).toEqual(canonicalFiles);

    assertUnique(manifest.assets.map((asset) => asset.id));
    assertUnique(manifest.assets.map((asset) => asset.file));
    assertUnique(manifest.assets.map((asset) => asset.publicPath));

    for (const asset of manifest.assets) {
      const assetPath = path.resolve(actionFallbackDirectory, asset.file);

      expect(path.dirname(assetPath)).toBe(actionFallbackDirectory);
      expect(existsSync(assetPath)).toBe(true);
      expect(asset.publicPath).toBe(
        `${manifest.publicUrlPrefix}${asset.file}`,
      );

      const actualSha256 = createHash("sha256")
        .update(readFileSync(assetPath))
        .digest("hex");

      expect(asset.sha256).toBe(actualSha256);
    }
  });
});
