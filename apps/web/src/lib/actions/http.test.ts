import { describe, expect, it } from "vitest";
import { buildActionsQueryString, buildMapActionsQueryString } from "./http";

describe("actions http query builders", () => {
  it("serializes list filters", () => {
    const query = buildActionsQueryString({
      status: "approved",
      association: "AEBCPEV",
      qualityGrade: "B",
      toFixPriority: true,
      impact: "fort",
      limit: 42,
    });
    const params = new URLSearchParams(query);
    expect(params.get("status")).toBe("approved");
    expect(params.get("association")).toBe("AEBCPEV");
    expect(params.get("qualityGrade")).toBe("B");
    expect(params.get("toFixPriority")).toBe("true");
    expect(params.get("impact")).toBe("fort");
    expect(params.get("limit")).toBe("42");
  });

  it("serializes map filters", () => {
    const query = buildMapActionsQueryString({
      status: "all",
      association: "Wings of the Ocean",
      impact: "critique",
      qualityMin: 79.7,
      days: 7,
      limit: 20,
    });
    const params = new URLSearchParams(query);
    expect(params.get("association")).toBe("Wings of the Ocean");
    expect(params.get("impact")).toBe("critique");
    expect(params.get("qualityMin")).toBe("80");
    expect(params.get("days")).toBe("7");
    expect(params.get("limit")).toBe("20");
  });
});
