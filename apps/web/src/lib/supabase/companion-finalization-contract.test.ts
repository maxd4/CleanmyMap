import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const trackingServicePath = new URL(
  "../../../../../companion-app/lib/tracking-service.ts",
  import.meta.url,
);

it("propagates the compute_mission_distance RPC error before mobile success", () => {
  const source = readFileSync(trackingServicePath, "utf8");

  expect(source).toMatch(/client\.rpc\(['"]compute_mission_distance['"]/i);
  expect(source).toMatch(/distanceError\s*=\s*result\.error/i);
  expect(source).toMatch(/if\s*\(distanceError\)[\s\S]+?ok:\s*false[\s\S]+?distanceError\.message/i);
  expect(source).toMatch(/await clearStoredMissionId\(\)[\s\S]+?return \{ ok: true, data \}/i);
  expect(source).not.toMatch(/distance_m|duration_s|computeDistance|haversine/i);
});
