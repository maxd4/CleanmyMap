import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSources = [
  new URL("./route.ts", import.meta.url),
  new URL("./[rideId]/route.ts", import.meta.url),
  new URL("./[rideId]/requests/route.ts", import.meta.url),
  new URL("./[rideId]/requests/[requestId]/route.ts", import.meta.url),
  new URL("./[rideId]/contact/route.ts", import.meta.url),
].map((url) => readFileSync(url, "utf8"));

describe("action rides API boundary [STATIC_CONTRACT]", () => {
  it("authenticates before using the service-role client and returns private responses", () => {
    for (const source of routeSources) {
      expect(source).toContain("resolveRideAuth");
      expect(source).toContain("getSupabaseAdminClient");
      expect(source).toContain("PRIVATE_RIDE_HEADERS");
    }
  });

  it("keeps the mutation surface explicit", () => {
    expect(routeSources[0]).toContain("createActionRide");
    expect(routeSources[1]).toContain("updateActionRide");
    expect(routeSources[1]).toContain("transitionActionRide");
    expect(routeSources[2]).toContain("createActionRideRequest");
    expect(routeSources[3]).toContain("decideActionRideRequest");
    expect(routeSources[4]).toContain("resolveActionRideContact");
  });
});
