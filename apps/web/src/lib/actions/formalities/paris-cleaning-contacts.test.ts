import { describe, expect, it } from "vitest";
import {
  parseParisArrondissementCode,
  resolveParisCleaningDivisionContacts,
} from "./paris-cleaning-contacts";

describe("Paris participatory cleaning division contacts", () => {
  it("accepts only the official Paris municipal district code range", () => {
    expect(parseParisArrondissementCode("75107")).toBe(7);
    expect(parseParisArrondissementCode("75120")).toBe(20);
    expect(parseParisArrondissementCode("75007")).toBeNull();
    expect(parseParisArrondissementCode("75121")).toBeNull();
    expect(parseParisArrondissementCode(null)).toBeNull();
  });

  it("uses the published 7e/8e division contact and exposes the published email only when the 7e is selected", () => {
    expect(resolveParisCleaningDivisionContacts([7])).toEqual([
      expect.objectContaining({
        id: "paris-7-8",
        phone: "01 45 61 57 00",
        email: "DPE-STPP-7/8e-Exploitation7e@paris.fr",
        emailArrondissements: [7],
      }),
    ]);

    expect(resolveParisCleaningDivisionContacts([8])).toEqual([
      expect.objectContaining({ id: "paris-7-8", phone: "01 45 61 57 00" }),
    ]);
    expect(resolveParisCleaningDivisionContacts([8])[0]).not.toHaveProperty("email");
  });

  it("returns only the divisions covered by selected arrondissements", () => {
    const contacts = resolveParisCleaningDivisionContacts([7, 9, 10, 17]);
    expect(contacts.map((contact) => contact.id)).toEqual(["paris-7-8", "paris-9-10", "paris-17"]);
    expect(contacts.map((contact) => contact.phone)).toEqual([
      "01 45 61 57 00",
      "01 53 34 11 11",
      "01 45 61 57 17",
    ]);
    expect(resolveParisCleaningDivisionContacts([])).toEqual([]);
  });
});
