import { describe, expect, it } from"vitest";
import {
 ACADEMIE_CLIMAT_WORKSHOPS,
 getTotalUpcomingAcademieClimatWorkshops,
 getVisibleAcademieClimatWorkshops,
} from"./academie-climat-workshops";

describe("academie climat workshops", () => {
 it("hides empty categories and keeps upcoming workshops sorted", () => {
 const referenceDate = new Date("2026-04-23T00:00:00.000Z");
 const categories = getVisibleAcademieClimatWorkshops(referenceDate);

 expect(categories.map((category) => category.id)).toEqual([
"social",
"environnemental",
 ]);
 expect(categories.some((category) => category.id ==="humanitaire")).toBe(false);
 expect(categories.every((category) => category.workshops.length > 0)).toBe(true);

 const socialCategory = categories.find((category) => category.id ==="social");
 expect(socialCategory?.workshops.map((workshop) => workshop.title)).toEqual(
 expect.arrayContaining([
"Prix de l'Éducation pour le Climat 2026",
"Inventons nos CHOUETTES vies bas carbone – dès 9 ans !",
"Atelier 2tonnes : comment agir pour le climat ?",
 ]),
 );

 for (const category of categories) {
 const orderedDates = category.workshops.map((workshop) => workshop.eventDate);
 const sortedDates = [...orderedDates].sort();
 expect(orderedDates).toEqual(sortedDates);
 }
 });

 it("counts the upcoming workshops displayed in the panel", () => {
 const referenceDate = new Date("2026-04-23T00:00:00.000Z");
 const categories = getVisibleAcademieClimatWorkshops(referenceDate);
 const total = getTotalUpcomingAcademieClimatWorkshops(referenceDate);

 expect(total).toBe(
 categories.reduce((sum, category) => sum + category.workshops.length, 0),
 );
 expect(total).toBeGreaterThan(0);
 expect(
 ACADEMIE_CLIMAT_WORKSHOPS.every((workshop) => {
 try {
 const parsed = new URL(workshop.sourceUrl);
 return parsed.hostname ==="www.academieduclimat.paris";
 } catch {
 return false;
 }
 }),
 ).toBe(true);
 });
});
