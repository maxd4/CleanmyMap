import { describe, expect, it } from "vitest";
import {
  buildActionDataContract,
  toActionListItem,
  toActionMapItem,
} from "@/lib/actions/data-contract";
import { parseEntityTypesParam } from "@/lib/actions/unified-source";

describe("actions contract regression gates", () => {
  it("preserves required fields for map, history, KPI and exports", () => {
    const contract = buildActionDataContract({
      id: "gate-1",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-12",
      createdAt: "2026-04-12T10:00:00.000Z",
      importedAt: "2026-04-12T10:00:00.000Z",
      validatedAt: "2026-04-12T11:00:00.000Z",
      locationLabel: "Paris 11",
      latitude: 48.86,
      longitude: 2.37,
      wasteKg: 7.5,
      cigaretteButts: 120,
      volunteersCount: 3,
      durationMinutes: 45,
      actorName: "Alice",
      associationName: "Action spontanee",
      notes: "ok",
      notesPlain: "ok",
    });

    const mapItem = toActionMapItem(contract);
    expect(mapItem.id).toBe("gate-1");
    expect(mapItem.action_date).toBe("2026-04-12");
    expect(mapItem.location_label).toBe("Paris 11");
    expect(mapItem.latitude).toBe(48.86);
    expect(mapItem.longitude).toBe(2.37);
    expect(mapItem.waste_kg).toBe(7.5);
    expect(mapItem.cigarette_butts).toBe(120);
    expect(mapItem.status).toBe("approved");
    expect(mapItem.geometry_source).toBe("estimated_area");
    expect(mapItem.contract?.metadata.volunteersCount).toBe(3);

    const listItem = toActionListItem(contract);
    expect(listItem.created_at).toBe("2026-04-12T10:00:00.000Z");
    expect(listItem.volunteers_count).toBe(3);
    expect(listItem.duration_minutes).toBe(45);
    expect(listItem.association_name).toBe("Action spontanee");
    expect(listItem.contract?.dates.validatedAt).toBe("2026-04-12T11:00:00.000Z");
  });

  it("keeps entity type parsing stable for API filters", () => {
    expect(parseEntityTypesParam("all")).toBeNull();
    expect(parseEntityTypesParam("action,spot,unknown,spot")).toEqual([
      "action",
      "spot",
    ]);
    expect(parseEntityTypesParam("unknown")).toBeNull();
  });
});
