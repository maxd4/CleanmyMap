import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
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

function getCanonicalWebpFiles(): string[] {
  return readdirSync(actionFallbackDirectory, { withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".webp"),
    )
    .map((entry) => entry.name)
    .sort();
}

function assertUnique(values: string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

describe("action fallback manifest integrity", () => {
  it("keeps the manifest and the 15 canonical WebP assets in exact agreement", () => {
    const canonicalFiles = getCanonicalWebpFiles();
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

  it("keeps fallback assets within the thumbnail delivery budget", async () => {
    const fourByThreeAssets = new Set([
      "cleanup-canal-02.webp",
      "cleanup-forest-lake-01.webp",
      "cleanup-lake-02.webp",
      "cleanup-village-01.webp",
      "sorting-park-01.webp",
    ]);

    for (const asset of manifest.assets) {
      const assetPath = path.resolve(actionFallbackDirectory, asset.file);
      const [metadata, file] = await Promise.all([
        sharp(assetPath).metadata(),
        readFileSync(assetPath),
      ]);

      expect(metadata.format, asset.file).toBe("webp");
      expect(metadata.width, asset.file).toBe(512);
      expect(metadata.height, asset.file).toBe(
        fourByThreeAssets.has(asset.file) ? 384 : 288,
      );
      expect(file.byteLength, asset.file).toBeLessThan(1_000_000);
    }
  });
});
