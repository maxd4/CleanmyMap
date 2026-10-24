import { describe, expect, it } from "vitest";
import { isReportModuleState } from "./report-generation-snapshot";

describe("report generation snapshot module state", () => {
  it("accepts the complete boolean module contract and rejects incomplete values", () => {
    expect(isReportModuleState({
      dataAndCartography: true,
      transparencyAndMethods: false,
      rawData: true,
      detailedFiles: false,
    })).toBe(true);
    expect(isReportModuleState({
      dataAndCartography: true,
      transparencyAndMethods: false,
      rawData: true,
    })).toBe(false);
    expect(isReportModuleState(null)).toBe(false);
  });
});
