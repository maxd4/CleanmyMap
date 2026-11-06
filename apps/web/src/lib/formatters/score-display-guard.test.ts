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
const THEORETICAL_RELEVANCE_CARD = resolve(
  __dirname,
  "../../components/sections/rubriques/route/components/route-pollution-relevance-card.tsx",
);
const AUTHORIZED_THEORETICAL_INDEX = [
  {
    file: THEORETICAL_RELEVANCE_CARD,
    pattern: /(?:Indice conservé pour audit|Index retained for audit).*\/\s*100(?!\d)/i,
  },
  {
    file: THEORETICAL_RELEVANCE_CARD,
    pattern: /Number\.isInteger\(score\) \? score : score\.toFixed\(2\)\} \/ 100/,
  },
  {
    file: THEORETICAL_RELEVANCE_CARD,
    pattern: /bestAttempt\.score \?\? "—"\} \/ 100 · \{fr \? "insuffisant" : "insufficient"\}/,
  },
  {
    file: resolve(
      __dirname,
      "../../components/sections/rubriques/route/components/route-alternative-comparison.tsx",
    ),
    pattern: /Number\.isInteger\(score\) \? score : score\.toFixed\(1\)\} \/ 100/,
  },
  {
    file: resolve(
      __dirname,
      "../../components/sections/rubriques/route/components/route-map.tsx",
    ),
    pattern: /(?:opacity: 0\.3 \+ \(Math\.max\(0, Math\.min\(100, value\)\) \/ 100\) \* 0\.55|heatmapCategoryLabel\(category, fr\).*Math\.round\(value\).*\/\s*100)/,
  },
];

function isAuthorizedTheoreticalIndex(file: string, line: string): boolean {
  return AUTHORIZED_THEORETICAL_INDEX.some((entry) => entry.file === file && entry.pattern.test(line));
}

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
              !TECHNICAL_SCORE_FORMULA.test(line) &&
              !isAuthorizedTheoreticalIndex(file, line),
          ),
      ),
    );

    expect(violations).toEqual([]);
  });

  it("keeps the theoretical-index allowance scoped to its named audit label", () => {
    expect(
      isAuthorizedTheoreticalIndex(
        THEORETICAL_RELEVANCE_CARD,
        "Indice conservé pour audit : 20 / 100",
      ),
    ).toBe(true);
    expect(
      isAuthorizedTheoreticalIndex(
        THEORETICAL_RELEVANCE_CARD,
        "Score historique : 20 / 100",
      ),
    ).toBe(false);
    expect(
      isAuthorizedTheoreticalIndex(
        join(__dirname, "unrelated-component.tsx"),
        "Indice conservé pour audit : 20 / 100",
      ),
    ).toBe(false);
    expect(
      isAuthorizedTheoreticalIndex(
        THEORETICAL_RELEVANCE_CARD,
        "Score historique : ${score.toFixed(2)} / 100",
      ),
    ).toBe(false);
    expect(
      isAuthorizedTheoreticalIndex(
        THEORETICAL_RELEVANCE_CARD,
        "Score historique : ${nearestRelevantSearch.bestAttempt.score} / 100",
      ),
    ).toBe(false);
    expect(
      isAuthorizedTheoreticalIndex(
        THEORETICAL_RELEVANCE_CARD,
        "Score historique : ${Math.round(score)} / 100",
      ),
    ).toBe(false);
    expect(
      isAuthorizedTheoreticalIndex(
        resolve(__dirname, "../../components/sections/rubriques/route/components/route-alternative-comparison.tsx"),
        "Score historique : ${score.toFixed(1)} / 100",
      ),
    ).toBe(false);
    expect(
      isAuthorizedTheoreticalIndex(
        resolve(__dirname, "../../components/sections/rubriques/route/components/route-map.tsx"),
        "Score historique : ${Math.round(value)} / 100",
      ),
    ).toBe(false);
  });
});
