import { describe, expect, it } from "vitest";
import {
  toActionListItem,
  toActionMapItem,
} from "./contracts/contract-mappers";
import {
  toPublicActionListItem,
  toPublicActionListResponse,
  toPublicActionMapItem,
  toPublicActionMapResponse,
} from "./public-dto";
import { buildActionDataContract } from "./contracts/contract-model";

const PRIVATE_IDENTITY_KEYS = new Set([
  "created_by_clerk_id",
  "createdByClerkId",
  "user_id",
  "userId",
  "owner_clerk_id",
  "ownerClerkId",
  "organizer_clerk_id",
  "organizerClerkId",
  "participant_clerk_id",
  "participantClerkId",
  "actor_user_id",
  "actorUserId",
]);

function findPrivateIdentityKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      findPrivateIdentityKeys(entry, `${path}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([key, entry]) => [
    ...(PRIVATE_IDENTITY_KEYS.has(key) ? [`${path}.${key}`] : []),
    ...findPrivateIdentityKeys(entry, `${path}.${key}`),
  ]);
}

function buildContract() {
  return buildActionDataContract({
    id: "action-public-dto",
    type: "action",
    status: "approved",
    source: "actions",
    createdByClerkId: "internal-owner",
    observedAt: "2026-09-20",
    createdAt: "2026-09-19T10:00:00.000Z",
    locationLabel: "Quai public",
    latitude: 48.8566,
    longitude: 2.3522,
    actorName: "Association publique",
    wasteKg: 2,
    cigaretteButts: 3,
    volunteersCount: 4,
    durationMinutes: 60,
  });
}

describe("public action DTO boundary", () => {
  it("keeps owner identity in the internal mappers", () => {
    const contract = buildContract();

    expect(toActionListItem(contract)).toMatchObject({
      created_by_clerk_id: "internal-owner",
      contract: { createdByClerkId: "internal-owner" },
    });
    expect(toActionMapItem(contract)).toMatchObject({
      created_by_clerk_id: "internal-owner",
      contract: { createdByClerkId: "internal-owner" },
    });
  });

  it("removes private identity keys recursively while preserving public fields", () => {
    const contract = buildContract();
    const publicList = toPublicActionListItem(contract);
    const publicMap = toPublicActionMapItem(contract);

    expect(findPrivateIdentityKeys(publicList)).toEqual([]);
    expect(findPrivateIdentityKeys(publicMap)).toEqual([]);
    expect(publicList).toMatchObject({
      id: "action-public-dto",
      actor_name: "Association publique",
      location_label: "Quai public",
    });
    expect(publicMap).toMatchObject({
      id: "action-public-dto",
      location_label: "Quai public",
      latitude: 48.8566,
      longitude: 2.3522,
    });
  });

  it("sanitizes complete public responses, including nested identity fields", () => {
    const listResponse = toPublicActionListResponse({
      status: "ok",
      count: 1,
      items: [toActionListItem(buildContract())],
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
      partialSource: false,
    });
    const mapResponse = toPublicActionMapResponse({
      status: "ok",
      count: 1,
      daysWindow: 30,
      items: [toActionMapItem(buildContract())],
      partialSource: false,
    });

    expect(findPrivateIdentityKeys(listResponse)).toEqual([]);
    expect(findPrivateIdentityKeys(mapResponse)).toEqual([]);
    expect(listResponse.items[0]).toHaveProperty("actor_name", "Association publique");
    expect(mapResponse.items[0]).toHaveProperty("location_label", "Quai public");
  });
});
