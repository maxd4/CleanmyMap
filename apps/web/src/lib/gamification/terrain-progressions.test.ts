import { describe, expect, it } from "vitest";
import { buildTerrainProgressions } from "./terrain-progressions";

describe("terrain progressions", () => {
  it("converges the four terrain metrics without sharing a counter", () => {
    const progressions = buildTerrainProgressions({
      participationCount: 3,
      organisationCount: 5,
      explorationCount: 8,
      cleanZonesCount: 1,
    });

    expect(Object.keys(progressions)).toEqual([
      "participation",
      "organisation",
      "exploration",
      "clean_zones",
    ]);
    expect(progressions.participation.currentValue).toBe(3);
    expect(progressions.participation.currentBadge?.label).toBe("Éclaireur");
    expect(progressions.organisation.currentValue).toBe(5);
    expect(progressions.organisation.currentBadge?.label).toBe("Saphir");
    expect(progressions.exploration.currentValue).toBe(8);
    expect(progressions.exploration.currentBadge?.label).toBe("Patrouilleur");
    expect(progressions.clean_zones.currentValue).toBe(1);
    expect(progressions.clean_zones.currentBadge?.label).toBe("Brise");
  });

  it("keeps each progression on its canonical badge scale beyond named tiers", () => {
    const progressions = buildTerrainProgressions({
      participationCount: 35,
      organisationCount: 25,
      explorationCount: 55,
      cleanZonesCount: 45,
    });

    expect(progressions.participation.currentBadge?.label).toBe("Gardien");
    expect(progressions.participation.nextBadge?.label).toBe("Gardien");
    expect(progressions.organisation.currentBadge?.label).toBe("Pilier II");
    expect(progressions.organisation.nextBadge?.label).toBe("Pilier III");
    expect(progressions.exploration.currentBadge?.label).toBe("Maître des Cartes");
    expect(progressions.exploration.nextBadge?.label).toBe("Maître des Cartes");
    expect(progressions.clean_zones.currentBadge?.label).toBe("Eden");
    expect(progressions.clean_zones.nextBadge?.label).toBe("Eden");
  });

  it("attributes XP to the matching terrain progression only", () => {
    const progressions = buildTerrainProgressions({
      participationCount: 1,
      organisationCount: 1,
      explorationCount: 1,
      cleanZonesCount: 1,
      events: [
        {
          event_type: "participant_tier_unlock",
          status_phase: "pending",
          source_table: "action_participants",
          source_id: "participant:participant-1",
          xp_awarded: 1,
        },
        {
          event_type: "action_declare_validation",
          status_phase: "validated",
          source_table: "actions",
          source_id: "action-1",
          xp_awarded: 1,
        },
        {
          event_type: "new_place_discovered",
          status_phase: "validated",
          source_table: "user_visited_places",
          source_id: "user-1:place-1",
          xp_awarded: 1,
        },
        {
          event_type: "clean_zone_task",
          status_phase: "validated",
          source_table: "clean_zones",
          source_id: "clean-zone:place-1",
          xp_awarded: 1,
        },
        {
          event_type: "sensitive_zone_milestone",
          status_phase: "validated",
          source_table: "sensitive_zone_milestones",
          source_id: "sensitive-zone:threshold:1",
          xp_awarded: 1,
        },
        {
          event_type: "first_trace_utile",
          status_phase: "validated",
          source_table: "actions",
          source_id: "first_trace_utile",
          xp_awarded: 1,
        },
      ],
    });

    expect(progressions.participation.xpContribution).toBe(1);
    expect(progressions.organisation.xpContribution).toBe(1);
    expect(progressions.exploration.xpContribution).toBe(1);
    expect(progressions.clean_zones.xpContribution).toBe(1);
  });

  it("does not count a replayed logical event twice", () => {
    const progressions = buildTerrainProgressions({
      participationCount: 1,
      organisationCount: 1,
      explorationCount: 1,
      cleanZonesCount: 1,
      events: [
        {
          event_type: "clean_zone_task",
          status_phase: "validated",
          source_table: "clean_zones",
          source_id: "clean-zone:place-1",
          xp_awarded: 1,
        },
        {
          event_type: "clean_zone_task",
          status_phase: "validated",
          source_table: "clean_zones",
          source_id: "clean-zone:place-1",
          xp_awarded: 1,
        },
      ],
    });

    expect(progressions.clean_zones.xpContribution).toBe(1);
  });
});
