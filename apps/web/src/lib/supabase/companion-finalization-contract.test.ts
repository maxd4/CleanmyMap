import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const trackingServicePath = new URL(
  "../../../../../apps/mobile/lib/tracking-service.ts",
  import.meta.url,
);

it("returns the mission row finalized by the completion UPDATE", () => {
  const source = readFileSync(trackingServicePath, "utf8");

  expect(source).toMatch(
    /await flushBuffer\(\)[\s\S]+?\.from\(['"]missions['"]\)[\s\S]+?\.update\(\{[\s\S]+?status:\s*['"]completed['"][\s\S]+?ended_at:/i,
  );
  expect(source).toMatch(/\.select\(\)[\s\S]+?\.single<Mission>\(\)/i);
  expect(source).not.toMatch(/compute_mission_distance|client\.rpc\(/i);
  expect(source).toMatch(/await clearStoredMissionId\(\)[\s\S]+?return \{ ok: true, data \}/i);
  expect(source).not.toMatch(/distance_m|duration_s|computeDistance|haversine/i);
});
