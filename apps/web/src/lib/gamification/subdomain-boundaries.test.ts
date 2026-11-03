import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  PROGRESSION_RULES_V2 as publicProgressionRules,
  computeCurrentLevel as publicComputeCurrentLevel,
} from "./progression";
import {
  PROGRESSION_RULES_V2 as canonicalProgressionRules,
  computeCurrentLevel as canonicalComputeCurrentLevel,
} from "./progression/progression-formulas";
import { loadActionRowsForUser as publicLoadActionRowsForUser } from "./progression-data";
import { loadActionRowsForUser as canonicalLoadActionRowsForUser } from "./progression/progression-action-queries";

const gamificationRoot = path.dirname(fileURLToPath(import.meta.url));

describe("Gamification subdomain boundaries", () => {
  it("keeps progression and reconciliation under explicit owners", () => {
    expect(fs.existsSync(path.join(gamificationRoot, "progression", "progression-rules.ts"))).toBe(true);
    expect(fs.existsSync(path.join(gamificationRoot, "progression", "progression-formulas.ts"))).toBe(true);
    expect(fs.existsSync(path.join(gamificationRoot, "reconciliation", "gamification-reconciliation.ts"))).toBe(true);
    expect(fs.existsSync(path.join(gamificationRoot, "reconciliation", "gamification-reconciliation-receipt.ts"))).toBe(true);
    expect(fs.existsSync(path.join(gamificationRoot, "progression-rules.ts"))).toBe(false);
    expect(fs.existsSync(path.join(gamificationRoot, "gamification-reconciliation.ts"))).toBe(false);
  });

  it("keeps the public progression facades on the canonical implementations", () => {
    expect(publicProgressionRules).toBe(canonicalProgressionRules);
    expect(publicComputeCurrentLevel).toBe(canonicalComputeCurrentLevel);
    expect(publicLoadActionRowsForUser).toBe(canonicalLoadActionRowsForUser);
  });
});
