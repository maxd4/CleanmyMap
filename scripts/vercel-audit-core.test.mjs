import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDynamicPageLabel,
  formatHeavyImportLabel,
  hasNearbyJustificationComment,
  scanVercelSurface,
} from "./vercel-audit-core.mjs";

test("collects runtime imports and exports while ignoring type-only declarations", () => {
  const files = new Map([
    ["apps/web/src/app/page.tsx", [
      "import { runtime }   from   \"./runtime\";",
      "import type\t{ TypeOnly }\tfrom\t\"./type-only\";",
      "export { exported }\tfrom\t\"./exported\";",
      "export type { TypeOnly } from \"./type-only\";",
      `const longComment = "${"x".repeat(10000)}";`,
    ].join("\n")],
    ["apps/web/src/app/runtime.ts", "cookies();"],
    ["apps/web/src/app/exported.ts", "auth();"],
    ["apps/web/src/app/type-only.ts", "headers();"],
  ]);
  const view = {
    listFiles(root) {
      return [...files.keys()].filter((filePath) => filePath.startsWith(root));
    },
    readText(filePath) {
      return files.get(filePath);
    },
  };

  const result = scanVercelSurface({ view });
  const page = result.dynamicPages.find(({ path }) => path === "apps/web/src/app/page.tsx");

  assert.deepEqual(page?.signals, ["auth", "cookies"]);
  assert.equal(result.headersFiles.includes("apps/web/src/app/type-only.ts"), true);
  assert.equal(page?.signals.includes("headers"), false);
});

test("collects the operational Vercel signals and keeps their projections sorted", () => {
  const files = new Map([
    ["apps/web/src/app/api/report/route.ts", [
      "export const dynamic = \"force-dynamic\";",
      "export const revalidate = 0;",
      "const cache = \"no-store\";",
      "cookies(); headers(); auth();",
      "fetch(\"https://provider.example/data\");",
      "import { chart } from \"recharts\";",
      "setInterval(() => fetch(\"https://provider.example/poll\"), 1000);",
    ].join("\n")],
    ["apps/web/src/app/page.tsx", [
      "export const dynamic = \"force-dynamic\";",
      "import { loadRuntime } from \"./runtime\";",
    ].join("\n")],
    ["apps/web/src/app/runtime.ts", "auth();"],
    ["apps/web/src/app/z/page.tsx", "export const revalidate = 0;"],
    ["apps/web/src/app/ignored.test.ts", "fetch(\"https://ignored.example\");"],
  ]);
  const view = {
    listFiles(root) {
      return [...files.keys()].filter((filePath) => filePath.startsWith(root));
    },
    readText(filePath) {
      return files.get(filePath);
    },
  };

  const result = scanVercelSurface({ view });

  assert.deepEqual(result.apiRoutes, ["apps/web/src/app/api/report/route.ts"]);
  assert.deepEqual(result.forceDynamicPages, [
    "apps/web/src/app/page.tsx",
    "apps/web/src/app/api/report/route.ts",
  ].sort());
  assert.deepEqual(result.revalidateZeroPages, [
    "apps/web/src/app/api/report/route.ts",
    "apps/web/src/app/z/page.tsx",
  ]);
  assert.deepEqual(result.noStoreRoutes, ["apps/web/src/app/api/report/route.ts"]);
  assert.deepEqual(result.cookiesFiles, ["apps/web/src/app/api/report/route.ts"]);
  assert.deepEqual(result.headersFiles, ["apps/web/src/app/api/report/route.ts"]);
  assert.deepEqual(result.authFiles, [
    "apps/web/src/app/api/report/route.ts",
    "apps/web/src/app/runtime.ts",
  ]);
  assert.deepEqual(result.heavyImports, [{
    path: "apps/web/src/app/api/report/route.ts",
    packageName: "recharts",
  }]);
  assert.deepEqual(result.pollingFiles, ["apps/web/src/app/api/report/route.ts"]);
  assert.deepEqual(result.externalFetches, ["apps/web/src/app/api/report/route.ts"]);
  assert.deepEqual(result.dynamicPages, [
    { path: "apps/web/src/app/page.tsx", signals: ["auth", "force-dynamic"] },
    { path: "apps/web/src/app/z/page.tsx", signals: ["revalidate=0"] },
  ]);
  assert.equal(formatHeavyImportLabel(result.heavyImports[0]), "apps/web/src/app/api/report/route.ts :: recharts");
  assert.equal(formatDynamicPageLabel(result.dynamicPages[0]), "apps/web/src/app/page.tsx [auth, force-dynamic]");
});

test("nearby Vercel justification is bounded to the preceding comment window", () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-vercel-audit-test-"));
  const fixturePath = path.join(fixtureRoot, "route.ts");
  try {
    fs.writeFileSync(fixturePath, [
      "// Published PDF must be revocable immediately, so this route uses no-store.",
      "// The comment is intentionally adjacent to the cache marker.",
      "export const cacheControl = \"no-store\";",
    ].join("\n"));
    assert.equal(hasNearbyJustificationComment(fixturePath, /no-store/), true);

    fs.writeFileSync(fixturePath, [
      "// unrelated note",
      "",
      "",
      "",
      "export const cacheControl = \"no-store\";",
    ].join("\n"));
    assert.equal(hasNearbyJustificationComment(fixturePath, /no-store/), false);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
