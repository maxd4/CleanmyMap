import { describe, expect, it } from "vitest";
import { buildAccessLinks } from "./access-screen-constants";

describe("pilotage access links", () => {
  it("keeps overview icons serializable across the client boundary", () => {
    expect(buildAccessLinks("benevole", "fr").map((item) => item.icon)).toEqual([
      "BarChart3",
      "FileText",
      "Compass",
      "Settings",
      "ShieldCheck",
    ]);
  });

  it("keeps the God Mode icon serializable for the max profile", () => {
    expect(buildAccessLinks("max", "fr").at(-1)?.icon).toBe("LockKeyhole");
  });
});
