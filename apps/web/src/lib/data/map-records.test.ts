import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/local-store", () => ({
  readAllLocalStores: vi.fn(),
}));

vi.mock("@/lib/persistence/runtime-store", () => ({
  allowLocalActionStoreInCurrentRuntime: vi.fn(() => true),
}));

import { loadLocalActionContracts } from "./map-records";
import { readAllLocalStores } from "@/lib/data/local-store";

describe("local action contracts", () => {
  it("preserves real association metadata from local Google Sheet imports", async () => {
    vi.mocked(readAllLocalStores).mockResolvedValue({
      real: {
        version: 1,
        updatedAt: "2026-04-24T07:54:03.634Z",
        records: [
          {
            id: "real_action_05",
            recordType: "action",
            status: "validated",
            source: "google_sheet",
            title:
              "Rue Jacques Louvel-Tessier, 75010 Paris → Rue Marguerite Moret, 75011 Paris",
            description:
              "[cmm-meta]{\"associationName\":\"La Brigade Verte Paris\",\"placeType\":\"Rue/Allée/Villa/Ruelle/Impasse\",\"departureLocationLabel\":\"Rue Jacques Louvel-Tessier, 75010 Paris\",\"arrivalLocationLabel\":\"Rue Marguerite Moret, 75011 Paris\",\"routeStyle\":\"souple\",\"routeAdjustmentMessage\":\"Itinéraire reconstitué depuis les colonnes Départ / Arrivée\"}\n[google-sheet-sync]",
            location: {
              label:
                "Rue Jacques Louvel-Tessier, 75010 Paris → Rue Marguerite Moret, 75011 Paris",
              city: "Paris",
              latitude: 48.869342,
              longitude: 2.375222,
            },
            eventDate: "2026-04-22",
            metrics: {
              wasteKg: 20,
              cigaretteButts: 0,
              volunteersCount: 10,
              durationMinutes: 60,
            },
            map: {
              displayable: true,
              lat: 48.869342,
              lon: 2.375222,
            },
            trace: {
              externalId: "real_action_05",
              originTable: "google_sheet",
              importedAt: "2026-04-24T07:54:03.634Z",
              notes:
                "[cmm-meta]{\"associationName\":\"La Brigade Verte Paris\",\"placeType\":\"Rue/Allée/Villa/Ruelle/Impasse\",\"departureLocationLabel\":\"Rue Jacques Louvel-Tessier, 75010 Paris\",\"arrivalLocationLabel\":\"Rue Marguerite Moret, 75011 Paris\",\"routeStyle\":\"souple\",\"routeAdjustmentMessage\":\"Itinéraire reconstitué depuis les colonnes Départ / Arrivée\"}\n[google-sheet-sync]",
            },
          },
        ],
      },
      validated: {
        version: 1,
        updatedAt: "2026-04-24T07:54:03.634Z",
        records: [],
      },
    });

    const contracts = await loadLocalActionContracts({
      status: null,
      floorDate: "2026-04-01",
      limit: 10,
      requireCoordinates: false,
    });

    expect(contracts).toHaveLength(1);
    const first = contracts[0];
    expect(first).toBeDefined();
    if (!first) {
      return;
    }
    expect(first.source).toBe("google_sheet");
    expect(first.metadata.associationName).toBe("La Brigade Verte Paris");
    expect(first.metadata.placeType).toBe(
      "Rue/Allée/Villa/Ruelle/Impasse",
    );
    expect(first.metadata.departureLocationLabel).toBe(
      "Rue Jacques Louvel-Tessier, 75010 Paris",
    );
    expect(first.metadata.arrivalLocationLabel).toBe(
      "Rue Marguerite Moret, 75011 Paris",
    );
    expect(first.metadata.routeStyle).toBe("souple");
  });
});
