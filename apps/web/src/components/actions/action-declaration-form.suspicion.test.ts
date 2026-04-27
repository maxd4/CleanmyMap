import { describe, expect, it } from"vitest";
import type { ActionVisionEstimate } from"@/lib/actions/types";
import {
 getBagCountSuspicion,
 getDensitySuspicion,
 getFillLevelSuspicion,
 getWasteWeightSuspicion,
} from"./action-declaration-form.suspicion";

const estimate: ActionVisionEstimate = {
 modelVersion:"vision-hybrid-v1",
 source:"hybrid",
 provisional: false,
 bagsCount: { value: 3, confidence: 0.82, interval: [2, 4] },
 fillLevel: { value: 75, confidence: 0.8, interval: [60, 90] },
 density: { value:"humide_dense", confidence: 0.76, interval: null },
 wasteKg: { value: 5.5, confidence: 0.81, interval: [4.5, 6.5] },
};

describe("action declaration suspicion helpers", () => {
 it("flags a weight far from the estimate", () => {
 expect(getWasteWeightSuspicion("10", estimate).isSuspect).toBe(true);
 expect(getWasteWeightSuspicion("", estimate).isSuspect).toBe(false);
 });

 it("flags bag count and fill mismatches", () => {
 expect(getBagCountSuspicion("6", estimate).isSuspect).toBe(true);
 expect(getFillLevelSuspicion("25", estimate).isSuspect).toBe(true);
 expect(getFillLevelSuspicion("75", estimate).isSuspect).toBe(false);
 });

 it("flags density mismatch only when the user filled the field", () => {
 expect(getDensitySuspicion("sec", estimate).isSuspect).toBe(true);
 expect(getDensitySuspicion("", estimate).isSuspect).toBe(false);
 });
});
