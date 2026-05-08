import { describe, expect, it } from"vitest";
import {
 defaultCommunityEventOps,
 formatCleanupSupportLabel,
 formatCleanupWasteTypesLabel,
 mergeCommunityEventOps,
 parseCommunityEventDescription,
 serializeCommunityEventDescription,
} from"./event-ops";

describe("community event ops", () => {
 it("serializes and parses cleanup metadata alongside the description", () => {
 const description = serializeCommunityEventDescription(
 "Cleanup du canal",
 {
 ...defaultCommunityEventOps(),
 cleanupObjective: "Nettoyer la berge",
 cleanupZone: "Canal Saint-Martin",
 cleanupLogisticsNeeds: "Gants et sacs",
 cleanupSupportLevel: "fort",
 cleanupWasteTypesExpected: ["megots", "plastique", "verre"],
 },
 );

 const parsed = parseCommunityEventDescription(description);
 expect(parsed.plainDescription).toBe("Cleanup du canal");
 expect(parsed.ops.cleanupObjective).toBe("Nettoyer la berge");
 expect(parsed.ops.cleanupZone).toBe("Canal Saint-Martin");
 expect(parsed.ops.cleanupLogisticsNeeds).toBe("Gants et sacs");
 expect(parsed.ops.cleanupSupportLevel).toBe("fort");
 expect(parsed.ops.cleanupWasteTypesExpected).toEqual([
 "megots",
 "plastique",
 "verre",
 ]);
 });

 it("keeps cleanup fields when merging partial ops", () => {
 const merged = mergeCommunityEventOps(defaultCommunityEventOps(), {
 cleanupObjective: "Objectif terrain",
 cleanupSupportLevel: "moyen",
 cleanupWasteTypesExpected: ["metal", "mixte"],
 });

 expect(merged.cleanupObjective).toBe("Objectif terrain");
 expect(merged.cleanupSupportLevel).toBe("moyen");
 expect(merged.cleanupWasteTypesExpected).toEqual(["metal", "mixte"]);
 });

 it("formats cleanup labels for the UI and exports", () => {
 expect(formatCleanupSupportLabel("faible")).toBe("Soutien léger");
 expect(formatCleanupSupportLabel(null)).toBe("Soutien à préciser");
 expect(formatCleanupWasteTypesLabel(["megots", "verre"])).toBe("Mégots, Verre");
 });
});
