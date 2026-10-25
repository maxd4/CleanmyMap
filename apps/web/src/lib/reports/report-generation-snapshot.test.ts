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

  it.each([
    ["all enabled", { dataAndCartography: true, transparencyAndMethods: true, rawData: true, detailedFiles: true }, true],
    ["all disabled", { dataAndCartography: false, transparencyAndMethods: false, rawData: false, detailedFiles: false }, true],
    ["string value", { dataAndCartography: "true", transparencyAndMethods: true, rawData: false, detailedFiles: false }, false],
    ["numeric value", { dataAndCartography: 1, transparencyAndMethods: true, rawData: false, detailedFiles: false }, false],
    ["array", [], false],
    ["undefined", undefined, false],
  ] as const)("classifies %s without coercing module values", (_label, value, expected) => {
    expect(isReportModuleState(value)).toBe(expected);
  });

  it("requires every module flag even when extra metadata is present", () => {
    expect(isReportModuleState({
      dataAndCartography: true,
      transparencyAndMethods: true,
      rawData: false,
      detailedFiles: true,
      forged: true,
    })).toBe(true);
    expect(isReportModuleState({
      dataAndCartography: true,
      transparencyAndMethods: true,
      rawData: false,
      detailedFiles: null,
      forged: true,
    })).toBe(false);
  });
});
