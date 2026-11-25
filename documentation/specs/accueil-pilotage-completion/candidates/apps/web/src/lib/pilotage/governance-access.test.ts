import { describe, expect, it } from "vitest";
import { canReadGovernanceAggregates } from "./governance-access";
describe("governance published aggregate access", () => {
  it("allows only active elected or IMU role", () => {
    for (const role of ["anonymous", "benevole", "coordinateur", "scientifique", "entreprise", "admin", "elu", "max"] as const) {
      expect(canReadGovernanceAggregates(role)).toBe(role === "elu" || role === "max");
    }
  });
});
