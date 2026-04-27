import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const COPY_FILES = [
  "src/lib/sections-registry.ts",
  "src/lib/profiles.ts",
  "src/lib/navigation.ts",
  "src/components/sections/section-renderer.tsx",
  "src/components/navigation/first-mission-onboarding.tsx",
  "src/components/ui/display-mode-onboarding-gate.tsx",
  "src/app/(app)/admin/page.tsx",
  "src/app/(app)/dashboard/page.tsx",
  "src/app/reports/page.tsx",
  "src/components/sections/rubriques/open-data-section.tsx",
  "src/components/sections/rubriques/funding-section.tsx",
  "src/components/sections/rubriques/guide-section.tsx",
  "src/components/sections/rubriques/weather-section.tsx",
  "src/components/sections/rubriques/annuaire-governance-panel.tsx",
  "src/components/sections/rubriques/annuaire-section.tsx",
  "src/components/sections/rubriques/climate-section.tsx",
  "src/components/sections/rubriques/discussion-badges-panel.tsx",
  "src/components/sections/rubriques/discussion-bug-report-form.tsx",
  "src/components/sections/rubriques/annuaire-directory-seed.ts",
  "src/components/sections/rubriques/community/kpis.ts",
  "src/components/sections/rubriques/gamification-section.tsx",
  "src/components/sections/rubriques/shared.tsx",
  "src/app/(app)/actions/history/page.tsx",
  "src/app/(app)/partners/dashboard/page.tsx",
  "src/components/reports/web-document/constants.ts",
  "src/components/reports/web-document/ui.tsx",
  "src/components/reports/web-document/sections.tsx",
  "src/components/reports/web-document/analytics.ts",
] as const;

const BANNED_UNACCENTED_FORMS = [
  /\bacces\b/i,
  /\bsynthese\b/i,
  /\bdonnees\b/i,
  /\bqualite\b/i,
  /\bmeteo\b/i,
  /\bpriorite\b/i,
  /\bpriorites\b/i,
  /\bitineraire\b/i,
  /\bdeveloppement\b/i,
  /\bdecideur\b/i,
  /\bsecurite\b/i,
  /\bparametres\b/i,
  /\bcompletude\b/i,
  /\bcoherence\b/i,
  /\bfraicheur\b/i,
  /\bgeolocalisation\b/i,
  /\bhypothese\b/i,
  /\binterpretation\b/i,
  /\bevenements\b/i,
  /\bbenevoles\b/i,
  /\bminimaliste\b/i,
] as const;

function collectHumanStrings(raw: string): string[] {
  const strings: string[] = [];
  // Safer string extraction: iterate character-by-character to avoid ReDoS
  // from nested quantifiers in regex like /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g
  const quotes = new Set(['"', "'", '`']);
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (!quotes.has(ch)) { i++; continue; }
    const quote = ch;
    let j = i + 1;
    let value = '';
    while (j < raw.length && raw[j] !== quote) {
      if (raw[j] === '\\' && j + 1 < raw.length) {
        value += raw[j + 1];
        j += 2;
      } else {
        value += raw[j];
        j++;
      }
    }
    if (j < raw.length) {
      // Ignore identifiers/keys and technical literals.
      if (!/\s|['’]/.test(value)) {
        // skip
      } else if (/^https?:\/\//i.test(value)) {
        // skip
      } else {
        strings.push(value);
      }
    }
    i = j + 1;
  }
  return strings;
}

describe("french copy accent regression guard", () => {
  it("does not contain banned unaccented French forms in key UI copy files", () => {
    const offenders: string[] = [];

    for (const relativePath of COPY_FILES) {
      const absPath = resolve(process.cwd(), relativePath);
      const raw = readFileSync(absPath, "utf8");
      const strings = collectHumanStrings(raw);

      for (const text of strings) {
        for (const pattern of BANNED_UNACCENTED_FORMS) {
          if (!pattern.test(text)) {
            continue;
          }
          offenders.push(`${relativePath}: "${text}"`);
          break;
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
