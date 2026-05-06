import { describe, expect, it } from "vitest";
import { toContractCreatePayload } from "@/lib/actions/contract-builders";
import { createActionSchema } from "./action";

describe("createActionSchema", () => {
  it("accepts clean_place contract payloads", () => {
    const payload = toContractCreatePayload({
      recordType: "clean_place",
      actorName: "Alice",
      associationName: "Action spontanée",
      actionDate: "2026-04-30",
      locationLabel: "Square test",
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 1,
      durationMinutes: 0,
      notes: "Lieux propres",
      submissionMode: "quick",
    });

    const parsed = createActionSchema.parse(payload);
    expect(parsed.recordType).toBe("clean_place");
    expect(parsed.locationLabel).toBe("Square test");
  });

  it("accepts spot contract payloads", () => {
    const payload = toContractCreatePayload({
      recordType: "spot",
      actorName: "Alice",
      associationName: "Action spontanée",
      actionDate: "2026-04-30",
      locationLabel: "Rue test",
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 1,
      durationMinutes: 0,
      notes: "Signalement",
      submissionMode: "quick",
    });

    const parsed = createActionSchema.parse(payload);
    expect(parsed.recordType).toBe("spot");
    expect(parsed.locationLabel).toBe("Rue test");
  });
});
