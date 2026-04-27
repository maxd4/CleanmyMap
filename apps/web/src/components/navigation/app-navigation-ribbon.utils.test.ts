import { describe, expect, it } from"vitest";
import type { NavigationSpace } from"@/lib/navigation";
import { getRibbonNavigationGroups } from"./app-navigation-ribbon.utils";

function makeSpace(id: NavigationSpace["id"], itemCount = 1): NavigationSpace {
 return {
 id,
 label: { fr: id, en: id },
 icon: id,
 color:"cmm-text-secondary",
 items: Array.from({ length: itemCount }, (_, index) => ({
 id: `${id}-${index}`,
 href: `/${id}/${index}`,
 label: { fr: `${id}-${index}`, en: `${id}-${index}` },
 description: { fr: `${id}-${index}`, en: `${id}-${index}` },
 routeId: `${id}-${index}`,
 })),
 };
}

describe("getRibbonNavigationGroups", () => {
 const spaces: NavigationSpace[] = [
 makeSpace("home"),
 makeSpace("act"),
 makeSpace("visualize"),
 makeSpace("impact"),
 makeSpace("network"),
 makeSpace("learn"),
 makeSpace("pilot"),
 ];

 it("keeps the four core blocks visible when the active block is primary", () => {
 const groups = getRibbonNavigationGroups(spaces,"visualize");

 expect(groups.primarySpaces.map((space) => space.id)).toEqual([
"home",
"act",
"visualize",
"impact",
 ]);
 expect(groups.secondarySpaces.map((space) => space.id)).toEqual([
"network",
"learn",
"pilot",
 ]);
 });

 it("promotes a secondary active block into the visible tabs", () => {
 const groups = getRibbonNavigationGroups(spaces,"learn");

 expect(groups.primarySpaces.map((space) => space.id)).toEqual([
"home",
"act",
"visualize",
"impact",
"learn",
 ]);
 expect(groups.secondarySpaces.map((space) => space.id)).toEqual([
"network",
"pilot",
 ]);
 expect(groups.activeSpace?.id).toBe("learn");
 });

 it("returns no active block when the path does not match a space", () => {
 const groups = getRibbonNavigationGroups(spaces, null);

 expect(groups.primarySpaces.map((space) => space.id)).toEqual([
"home",
"act",
"visualize",
"impact",
 ]);
 expect(groups.activeSpace).toBeNull();
 });
});
