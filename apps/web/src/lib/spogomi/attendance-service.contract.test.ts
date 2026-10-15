import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync(new URL("./attendance-service.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../../app/api/spogomi/events/[eventId]/attendance/route.ts", import.meta.url), "utf8");

describe("SPOGOMI attendance projection STATIC_CONTRACT", () => {
  it("keeps the roster response private, paginated and minimal", () => {
    expect(service).toContain("hasSpogomiCapability(access, \"checkin\")");
    expect(service).toContain("range(from, from + pageSize - 1)");
    expect(service).toContain("displayName");
    expect(service).toContain("attendanceStatus");
    expect(service).toContain("external_reference");
    expect(service).not.toContain("account_link_status");
  });

  it("requires a server-side event capability for reads and writes", () => {
    expect(route).toContain("resolveSpogomiEventAccess");
    expect(route).toContain("hasSpogomiCapability(eventAccess, \"checkin\")");
    expect(route).toContain("expectedUpdatedAt");
    expect(route).toContain("provenance");
  });
});
