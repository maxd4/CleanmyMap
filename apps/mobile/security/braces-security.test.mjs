import assert from "node:assert/strict";
import braces from "braces";
import test from "node:test";

test("preserves normal brace compilation", () => {
  assert.deepEqual(braces("a/{b,c}/d"), ["a/(b|c)/d"]);
});

test("rejects brace nesting beyond the parser safety bound", () => {
  const nested = "{".repeat(1001) + "x" + "}".repeat(1001);
  assert.throws(
    () => braces(nested),
    /Brace nesting depth exceeds max depth \(1000\)/,
  );
});
