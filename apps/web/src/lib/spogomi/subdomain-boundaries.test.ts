import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildDeterministicTeamFormation as publicBuildDeterministicTeamFormation,
} from "./preparation";
import {
  buildDeterministicTeamFormation as canonicalBuildDeterministicTeamFormation,
} from "./preparation/preparation";
import {
  createSpogomiEvent as publicCreateSpogomiEvent,
} from "./preparation-service";
import {
  createSpogomiEvent as canonicalCreateSpogomiEvent,
} from "./preparation/preparation-service";
import {
  SPOGOMI_ENVIRONMENTAL_MAPPING_VERSION as publicMappingVersion,
} from "./consolidation";
import {
  SPOGOMI_ENVIRONMENTAL_MAPPING_VERSION as canonicalMappingVersion,
} from "./results/consolidation";
import {
  buildSpogomiResultsProjection as publicBuildResultsProjection,
} from "./results-projection";
import {
  buildSpogomiResultsProjection as canonicalBuildResultsProjection,
} from "./results/results-projection";

const spogomiRoot = path.dirname(fileURLToPath(import.meta.url));

describe("SPOGOMI subdomain boundaries", () => {
  it("keeps preparation and results responsibilities under explicit owners", () => {
    expect(fs.existsSync(path.join(spogomiRoot, "preparation", "preparation-service.ts"))).toBe(true);
    expect(fs.existsSync(path.join(spogomiRoot, "preparation", "preparation-import.ts"))).toBe(true);
    expect(fs.existsSync(path.join(spogomiRoot, "results", "results-projection.ts"))).toBe(true);
    expect(fs.existsSync(path.join(spogomiRoot, "results", "consolidation-service.ts"))).toBe(true);
  });

  it("keeps public preparation entry points on canonical implementations", () => {
    expect(publicBuildDeterministicTeamFormation).toBe(canonicalBuildDeterministicTeamFormation);
    expect(publicCreateSpogomiEvent).toBe(canonicalCreateSpogomiEvent);
    expect(fs.readFileSync(path.join(spogomiRoot, "preparation-service.ts"), "utf8")).toContain(
      "./preparation/preparation-service",
    );
  });

  it("keeps public result entry points on canonical implementations", () => {
    expect(publicMappingVersion).toBe(canonicalMappingVersion);
    expect(publicBuildResultsProjection).toBe(canonicalBuildResultsProjection);
    expect(fs.readFileSync(path.join(spogomiRoot, "results-projection.ts"), "utf8")).toContain(
      "./results/results-projection",
    );
  });
});
