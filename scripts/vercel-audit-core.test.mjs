import assert from "node:assert/strict";
import test from "node:test";

import { scanVercelSurface } from "./vercel-audit-core.mjs";

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
