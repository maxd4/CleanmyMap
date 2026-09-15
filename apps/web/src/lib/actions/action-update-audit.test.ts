import { describe, expect, it } from "vitest";
import type { ActionRow } from "@/types/database";
import { extractActionMetadataFromNotes } from "./metadata";
import {
  buildActionAuditSnapshots,
  type ActionUpdateInput,
} from "./action-update-audit";

describe("action update audit snapshots", () => {
  it("projects stable before/after values without persisting private fields", () => {
    const current = {
      id: "action-1",
      created_at: "2026-09-01T10:00:00.000Z",
      created_by_clerk_id: "owner-1",
      actor_name: "Ancien nom",
      action_date: "2026-09-20",
      location_label: "Ancien lieu",
      latitude: 48.1,
      longitude: 2.3,
      derived_geometry_kind: "point",
      derived_geometry_geojson: null,
      geometry_confidence: null,
      waste_kg: 1,
      cigarette_butts: 2,
      volunteers_count: 3,
      duration_minutes: 30,
      event_start_time: "09:00",
      event_end_time: "10:00",
      notes: "Anciennes notes privées",
      status: "pending",
      published_at: null,
      moderation_visibility: "visible",
      action_phase: "pre_action",
      preparation_data: { actionTitle: "Ancienne préparation" },
    } satisfies ActionRow;
    const currentMetadata = extractActionMetadataFromNotes(current.notes);
    const body = {
      actorName: "Nouveau nom",
      locationLabel: "Nouveau lieu",
      latitude: 48.2,
      longitude: 2.4,
      preparationData: { actionTitle: "Nouvelle préparation" },
      photos: [
        {
          id: "photo-new",
          name: "nouvelle-photo.jpg",
          mimeType: "image/jpeg",
          size: 200,
          width: 20,
          height: 20,
          dataUrl: "data:image/jpeg;base64,private",
        },
      ],
    } as ActionUpdateInput;

    const snapshots = buildActionAuditSnapshots(
      current,
      body,
      currentMetadata,
    );

    expect(snapshots.previousValue).toMatchObject({
      status: "pending",
      actionPhase: "pre_action",
      actorNameChanged: true,
      locationChanged: true,
      coordinatesChanged: true,
      preparationDataChanged: true,
      photosChanged: true,
    });
    expect(snapshots.newValue).toMatchObject({
      status: "pending",
      actionPhase: "pre_action",
      wasteKg: 1,
      cigaretteButts: 2,
      volunteersCount: 3,
      durationMinutes: 30,
    });

    const serialized = JSON.stringify(snapshots);
    expect(serialized).not.toContain("Ancien nom");
    expect(serialized).not.toContain("Nouveau nom");
    expect(serialized).not.toContain("private");
  });
});
