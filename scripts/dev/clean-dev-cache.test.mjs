import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanDevCache } from "./clean-dev-cache.mjs";

const tempRoot = mkdtempSync(join(tmpdir(), "clean-dev-cache-test-"));

try {
  mkdirSync(join(tempRoot, "apps", "web", ".next-codex-old"), { recursive: true });
  mkdirSync(join(tempRoot, "apps", "web", ".next-sourcemap-test"), { recursive: true });
  mkdirSync(join(tempRoot, "apps", "web", ".next"), { recursive: true });
  mkdirSync(join(tempRoot, "apps", "web", ".turbo"), { recursive: true });
  mkdirSync(join(tempRoot, "apps", ".next"), { recursive: true });
  mkdirSync(join(tempRoot, ".turbo"), { recursive: true });
  writeFileSync(join(tempRoot, "apps", "web", "tsconfig.tsbuildinfo"), "generated", "utf8");

  await cleanDevCache({ root: tempRoot, logger: () => {} });

  for (const relativePath of [
    "apps/web/.next-codex-old",
    "apps/web/.next",
    "apps/web/.turbo",
    "apps/.next",
    ".turbo",
    "apps/web/tsconfig.tsbuildinfo",
  ]) {
    assert.equal(existsSync(join(tempRoot, relativePath)), false, relativePath);
  }

  assert.equal(existsSync(join(tempRoot, "apps", "web", ".next-sourcemap-test")), true);
  console.log("clean-dev-cache validation passed");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
