import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const { detectDarkReferences } = await createJiti(import.meta.url).import("./utils.ts");

test("detects bounded dark CSS tokens without matching nearby names or usages", () => {
  const longToken = `--${"x".repeat(1_000)}-dark`;
  const content = [
    ":root {",
    "  --glass-bg-dark: #111;",
    "  --glass-border-dark : #222;",
    "  --glass-bg-darkish: #333;",
    "  --glass-bg-dark-value: #444;",
    `  ${longToken}: #555;`,
    "  color: var(--glass-bg-dark);",
    "}",
  ].join("\n");

  const references = detectDarkReferences("fixture.css", content)
    .filter(({ kind }) => kind === "CSS_GLASS_DARK");

  assert.deepEqual(
    references.map(({ match }) => match),
    ["--glass-bg-dark", "--glass-border-dark"],
  );
});
