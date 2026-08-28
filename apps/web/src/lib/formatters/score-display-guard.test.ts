import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOTS = [
  resolve(__dirname, "../../components"),
  resolve(__dirname, "../../app/(app)"),
];
const LEGACY_SCORE_DISPLAY = /(?:\/\s*100(?!\d)|\bsur\s+100\b)/i;
const TECHNICAL_SCORE_FORMULA =
  /^\s*const offset = circumference - \(safeValue \/ 100\) \* circumference;\s*$/;

function collectSourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(path);
    }
    if (
      !entry.name.endsWith(".tsx") &&
      !entry.name.endsWith(".ts")
    ) {
      return [];
    }
    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
      return [];
    }
    return [path];
  });
}

describe("score display guard", () => {
  it("does not reintroduce legacy /100 score labels in UI sources", () => {
    const violations = SOURCE_ROOTS.flatMap((root) =>
      collectSourceFiles(root).flatMap((file) =>
        readFileSync(file, "utf8")
          .split(/\r?\n/)
          .map((line, index) => ({ file, line, lineNumber: index + 1 }))
          .filter(
            ({ line }) =>
              LEGACY_SCORE_DISPLAY.test(line) &&
              !TECHNICAL_SCORE_FORMULA.test(line),
          ),
      ),
    );

    expect(violations).toEqual([]);
  });
});
