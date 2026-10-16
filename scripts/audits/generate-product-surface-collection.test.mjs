import assert from "node:assert/strict";
import test from "node:test";

import { extractRegistryEntries } from "./generate-product-surface-collection.mjs";

test("extracts successive registry blocks and advances beyond each block", () => {
  const source = [
    "const registry = [",
    "  {",
    '    id: "first",',
    '    route: "/first",',
    "  },",
    "  {",
    '    id: "second",',
    '    route: "/second",',
    "  },",
    "];",
  ].join("\n");

  assert.deepEqual(
    extractRegistryEntries(source).map(({ id, route }) => ({ id, route })),
    [
      { id: "first", route: "/first" },
      { id: "second", route: "/second" },
    ],
  );
});

test("returns no entries when registry content is absent", () => {
  assert.deepEqual(extractRegistryEntries(null), []);
});
