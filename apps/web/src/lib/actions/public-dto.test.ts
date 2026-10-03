import { describe, expect, it } from "vitest";
import {
  toActionListItem,
  toActionMapItem,
} from "./contracts/contract-mappers";
import {
  toPublicActionListItem,
  toPublicActionListResponse,
  toPublicActionMapItem,
  projectPublicActionMapItem,
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

  it("projects only sanitized observed coverage from preparation data", () => {
    const contract = buildActionDataContract({
      id: "action-coverage",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-09-20",
      locationLabel: "Parc public",
      latitude: 48.85,
      longitude: 2.35,
      derivedGeometryKind: "polygon",
      derivedGeometryGeoJson: '{"type":"Polygon","coordinates":[[[2.35,48.85],[2.36,48.85],[2.35,48.85]]]}',
      preparationData: {
        observedCoverage: {
          type: "MultiLineString",
          coordinates: [[[2.35, 48.85], [2.36, 48.86]]],
          traceCount: 1,
          individualDistancesKm: [1],
          sources: ["gps_tracking"],
          coverageDistanceKm: null,
          coverageVersion: "observed-traces-v1",
        },
        gpxImport: { source: "gpx_import", observedDistanceKm: 1, pointCount: 2, inferredTopology: "loop" },
        privateTechnical: { mission_id: "private-mission", technical_provenance: "private" },
      } as never,
    });
    const publicMap = projectPublicActionMapItem(toActionMapItem(contract));
    expect(publicMap.contract?.metadata.preparationData).toEqual({
      observedCoverage: expect.objectContaining({ traceCount: 1 }),
    });
    expect(JSON.stringify(publicMap)).not.toContain("private-mission");
    expect(JSON.stringify(publicMap)).not.toContain("technical_provenance");
  });
});
