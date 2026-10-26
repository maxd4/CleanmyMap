import { expect, it } from "vitest";
import { buildContributorRecognitionIndex } from "./contributor-recognition";
import type { ActionRow } from "./progression-types";

function createRow(
  overrides: Partial<ActionRow> & Pick<ActionRow, "id" | "created_by_clerk_id" | "action_date" | "location_label">,
): ActionRow {
  return {
    id: overrides.id,
    created_at: `${overrides.action_date}T12:00:00Z`,
    created_by_clerk_id: overrides.created_by_clerk_id,
    actor_name: overrides.actor_name ?? "Contributeur",
    action_date: overrides.action_date,
    location_label: overrides.location_label,
    latitude: overrides.latitude ?? 48.8566,
    longitude: overrides.longitude ?? 2.3522,
    waste_kg: overrides.waste_kg ?? 2,
    cigarette_butts: overrides.cigarette_butts ?? 12,
    volunteers_count: overrides.volunteers_count ?? 3,
    duration_minutes: overrides.duration_minutes ?? 60,
    status: overrides.status ?? "approved",
    notes: overrides.notes ?? null,
  };
}

function buildAliceContributorRecognitionRows(): ActionRow[] {
  return [
    createRow({
      id: "alice-1",
      created_by_clerk_id: "user-alice",
      actor_name: "Alice",
      action_date: "2026-01-12",
      location_label: "Lyon 11e",
      notes: "association: Action spontanée\nrelais de communication",
      volunteers_count: 2,
    }),
    createRow({
      id: "alice-2",
      created_by_clerk_id: "user-alice",
      actor_name: "Alice",
      action_date: "2026-02-18",
      location_label: "Lyon 11e",
      notes: "association: Action spontanée\nrelais de communication",
      volunteers_count: 2,
    }),
  ];
}

function buildBobContributorRecognitionRows(): ActionRow[] {
  return [
    createRow({
      id: "bob-1",
      created_by_clerk_id: "user-bob",
      actor_name: "Bob",
      action_date: "2026-01-05",
      location_label: "Lyon 12e",
      notes: "association: Action spontanée\ncoordination terrain",
      volunteers_count: 7,
      duration_minutes: 90,
    }),
    createRow({
      id: "bob-2",
      created_by_clerk_id: "user-bob",
      actor_name: "Bob",
      action_date: "2026-02-05",
      location_label: "Lyon 12e",
      notes: "association: Action spontanée\ncoordination terrain",
      volunteers_count: 7,
      duration_minutes: 90,
    }),
    createRow({
      id: "bob-3",
      created_by_clerk_id: "user-bob",
      actor_name: "Bob",
      action_date: "2026-03-05",
      location_label: "Lyon 12e",
      notes: "association: Action spontanée\ncoordination terrain",
      volunteers_count: 7,
      duration_minutes: 90,
    }),
    createRow({
      id: "bob-4",
      created_by_clerk_id: "user-bob",
      actor_name: "Bob",
      action_date: "2026-04-05",
      location_label: "Lyon 12e",
      notes: "association: Action spontanée\ncoordination terrain",
      volunteers_count: 7,
      duration_minutes: 90,
    }),
    createRow({
      id: "bob-5",
      created_by_clerk_id: "user-bob",
      actor_name: "Bob",
      action_date: "2026-05-05",
      location_label: "Lyon 12e",
      notes: "association: Action spontanée\ncoordination terrain",
      volunteers_count: 7,
      duration_minutes: 90,
    }),
    createRow({
      id: "bob-6",
      created_by_clerk_id: "user-bob",
      actor_name: "Bob",
      action_date: "2026-06-05",
      location_label: "Lyon 12e",
      notes: "association: Action spontanée\ncoordination terrain",
      volunteers_count: 7,
      duration_minutes: 90,
    }),
    createRow({
      id: "bob-7",
      created_by_clerk_id: "user-bob",
      actor_name: "Bob",
      action_date: "2026-07-05",
      location_label: "Lyon 12e",
      notes: "association: Action spontanée\ncoordination terrain",
      volunteers_count: 7,
      duration_minutes: 90,
    }),
    createRow({
      id: "bob-8",
      created_by_clerk_id: "user-bob",
      actor_name: "Bob",
      action_date: "2026-08-05",
      location_label: "Lyon 12e",
      notes: "association: Action spontanée\ncoordination terrain",
      volunteers_count: 7,
      duration_minutes: 90,
    }),
  ];
}

function buildContributorRecognitionRows(): ActionRow[] {
  return [
    ...buildAliceContributorRecognitionRows(),
    ...buildBobContributorRecognitionRows(),
  ];
}

it("builds verified contributor cards with zone, regularity and mentor status", () => {
  const recognition = buildContributorRecognitionIndex(
    buildContributorRecognitionRows(),
    "user-bob",
  );

  expect(recognition.topContributors[0]?.userId).toBe("user-bob");
  expect(recognition.topContributors[0]?.mentorEligible).toBe(true);
  expect(recognition.topContributors[0]?.topZone).toBe("12e");
  expect(recognition.topContributors[0]?.regularityLabel).toBe("Régulier");
  expect(recognition.currentContributor?.userId).toBe("user-bob");
  expect(recognition.currentContributor?.thanksMessage).toContain("Action spontanée");
  expect(recognition.currentContributor?.badges).toContain("Mentor local");
  expect(recognition.currentContributor?.badges).toContain("Coordination vérifiée");
});

it("covers the remaining recognition families, empty inputs and privacy-safe fallbacks", () => {
  const rows = [
    createRow({
      id: "terrain-1",
      created_by_clerk_id: "user-terrain",
      actor_name: "",
      action_date: "2026-01-01",
      location_label: "Une très longue zone de contribution qui doit être tronquée, Paris",
      notes: "association: Action spontanée",
      volunteers_count: 1,
    }),
    createRow({
      id: "mentor-1",
      created_by_clerk_id: "user-mentor",
      actor_name: "Mentor",
      action_date: "2026-02-01",
      location_label: "Lille",
      notes: "association: Action spontanée\nformation et bonnes pratiques",
      waste_kg: 20,
      cigarette_butts: 80,
      volunteers_count: 2,
      duration_minutes: 180,
    }),
    createRow({
      id: "mentor-2",
      created_by_clerk_id: "user-mentor",
      actor_name: "Mentor",
      action_date: "2026-03-01",
      location_label: "Lille",
      notes: "association: Action spontanée\nréférent guide",
      waste_kg: 20,
      cigarette_butts: 80,
      volunteers_count: 2,
      duration_minutes: 180,
    }),
    createRow({
      id: "mentor-3",
      created_by_clerk_id: "user-mentor",
      actor_name: "Mentor",
      action_date: "2026-04-01",
      location_label: "Lille",
      notes: "association: Action spontanée\nmentor",
      waste_kg: 20,
      cigarette_butts: 80,
      volunteers_count: 2,
      duration_minutes: 180,
    }),
    createRow({
      id: "excluded-1",
      created_by_clerk_id: "user-excluded",
      action_date: "2026-05-01",
      location_label: "Nantes",
      notes: "Action spontanée",
      status: "pending",
    }),
  ];

  const recognition = buildContributorRecognitionIndex(rows);
  expect(recognition.currentContributor).toBeNull();
  expect(recognition.cardsByUserId.has("user-excluded")).toBe(false);
  expect(recognition.cardsByUserId.get("user-terrain")).toEqual(expect.objectContaining({
    associationName: "Action spontanée",
    contributionType: "terrain",
    regularityLabel: "Ponctuel",
  }));
  expect(recognition.cardsByUserId.get("user-mentor")).toEqual(expect.objectContaining({
    associationName: "Action spontanée",
    contributionType: "mentorat",
  }));
  expect(buildContributorRecognitionIndex([], "")).toMatchObject({
    topContributors: [],
    currentContributor: null,
  });
});

it("keeps regularity thresholds and zone normalization deterministic across larger histories", () => {
  const veryRegular = Array.from({ length: 12 }, (_, index) => createRow({
    id: `very-${index}`,
    created_by_clerk_id: "user-very",
    actor_name: "Très régulier",
    action_date: `2026-${String(index + 1).padStart(2, "0")}-01`,
    location_label: index === 0 ? "" : "Bordeaux",
    notes: "association: Action spontanée\nmentor formation",
    waste_kg: 20,
    cigarette_butts: 80,
    volunteers_count: 2,
    duration_minutes: 180,
  }));
  const continuous = [
    createRow({ id: "continuous-1", created_by_clerk_id: "user-continuous", action_date: "2026-01-01", location_label: "Nice", notes: "association: Action spontanée" }),
    createRow({ id: "continuous-2", created_by_clerk_id: "user-continuous", action_date: "2026-02-01", location_label: "Nice", notes: "association: Action spontanée" }),
    createRow({ id: "continuous-3", created_by_clerk_id: "user-continuous", action_date: "2026-02-15", location_label: "Nice", notes: "association: Action spontanée" }),
  ];

  const recognition = buildContributorRecognitionIndex([...veryRegular, ...continuous], "user-continuous");
  expect(recognition.cardsByUserId.get("user-very")).toEqual(expect.objectContaining({
    regularityLabel: "Très régulier",
    activeMonths: 12,
    topZone: "Bordeaux",
  }));
  expect(recognition.currentContributor).toEqual(expect.objectContaining({ regularityLabel: "En continuité" }));
});
