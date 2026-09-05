import { describe, expect, it } from "vitest";
import {
  canRequestPromotionRole,
  getRequestablePromotionRoles,
} from "./promotion-request-contract";

describe("promotion request contract", () => {
  it("allows open roles to request elu or admin", () => {
    for (const role of ["benevole", "coordinateur", "scientifique", "entreprise"] as const) {
      expect(getRequestablePromotionRoles(role)).toEqual(["elu", "admin"]);
      expect(canRequestPromotionRole(role, "elu")).toBe(true);
      expect(canRequestPromotionRole(role, "admin")).toBe(true);
    }
  });

  it("allows elu to request admin and closes admin-like roles", () => {
    expect(getRequestablePromotionRoles("elu")).toEqual(["admin"]);
    expect(canRequestPromotionRole("elu", "admin")).toBe(true);
    expect(canRequestPromotionRole("elu", "elu")).toBe(false);
    expect(getRequestablePromotionRoles("admin")).toEqual([]);
    expect(getRequestablePromotionRoles("max")).toEqual([]);
  });
});
