import { describe, expect, it } from"vitest";
import { estimateWasteKg } from"./action-declaration-form.estimation";

describe("action-declaration-form.estimation", () => {
 it("returns a positive rounded estimate", () => {
 const result = estimateWasteKg({
   volunteersCount:"3",
   durationMinutes:"90",
   placeType:"N° Boulevard/Avenue/Place",
 });
 expect(result).toBeGreaterThan(0);
 expect(Number.isInteger(result * 10)).toBe(true);
 });

 it("increases estimate with volunteers and duration", () => {
 const low = estimateWasteKg({
   volunteersCount:"1",
   durationMinutes:"30",
   placeType:"Monument",
 });
 const high = estimateWasteKg({
   volunteersCount:"5",
   durationMinutes:"120",
   placeType:"Monument",
 });
 expect(high).toBeGreaterThan(low);
 });

 it("applies the place factor without folding cigarette mass into wasteKg", () => {
 const street = estimateWasteKg({
   volunteersCount:"2",
   durationMinutes:"60",
   placeType:"N° Rue/Allée/Villa/Ruelle/Impasse",
 });
 const parkWithMegots = estimateWasteKg({
   volunteersCount:"2",
   durationMinutes:"60",
   placeType:"Bois/Parc/Jardin/Square/Sentier",
  });
 expect(parkWithMegots).toBeGreaterThan(street);
 });

 it("accepts canonical environment identifiers", () => {
 const parks = estimateWasteKg({ volunteersCount:"10", durationMinutes:"60", placeType:"parks_gardens" });
 const water = estimateWasteKg({ volunteersCount:"10", durationMinutes:"60", placeType:"rivers_lakes" });
 expect(parks).toBe(15.6);
 expect(water).toBe(13.8);
 });
});
