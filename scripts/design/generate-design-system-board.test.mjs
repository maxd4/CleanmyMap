import assert from "node:assert/strict";
import test from "node:test";

import fs from "node:fs";

import { parseLiteral, parseNavigationProfileSpaceMap } from "./generate-design-system-board.mjs";

test("parses the supported data literals without executing source code", () => {
  assert.deepEqual(
    parseLiteral(
      `const value = { safe: "ok", enabled: true, nested: [1, null, "x"] };`,
      "const value",
      "{",
    ),
    { safe: "ok", enabled: true, nested: [1, null, "x"] },
  );

  assert.deepEqual(
    parseLiteral(
      `const value = { route: ROUTE, label: "safe" };`,
      "const value",
      "{",
      { ROUTE: "/safe" },
    ),
    { route: "/safe", label: "safe" },
  );
});

test("rejects executable and computed literal syntax", () => {
  assert.throws(
    () => parseLiteral(`const value = { unsafe: (() => "executed")() };`, "const value", "{"),
    /Unsupported design-system literal syntax/,
  );
  assert.throws(
    () => parseLiteral(`const value = { ["unsafe"]: "value" };`, "const value", "{"),
    /Computed property names are not allowed/,
  );
});

test("parses the current navigation source without executing its helper", () => {
  const source = fs.readFileSync("apps/web/src/lib/navigation.ts", "utf8");
  const map = parseNavigationProfileSpaceMap(source);

  assert.deepEqual(map.benevole.home, ["dashboard", "explorer"]);
  assert.deepEqual(map.admin.home, ["dashboard", "explorer", "pilotage", "admin"]);
  assert.deepEqual(map.benevole.act, ["rejoindre-une-action", "new", "signalement"]);
});
