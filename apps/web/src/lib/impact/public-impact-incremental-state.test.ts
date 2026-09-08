import { describe, expect, it } from "vitest";

type Contribution = {
  actionId: string;
  actionDate: string;
  eligible: boolean;
  location: string | null;
  wasteKg: number;
  butts: number;
  participants: number;
  durationMinutes: number;
  categoryKey: string;
  categoryLabel: string;
  warning: string | null;
  condition: string | null;
  conditionButts: number;
};

type Aggregate = {
  visibleActions: number;
  distinctLocations: number;
  wasteKg: number;
  butts: number;
  participants: number;
  durationMinutes: number;
  distribution: Map<string, number>;
  warnings: Map<string, number>;
  locations: Map<string, number>;
  conditions: Map<string, number>;
};

type State = Aggregate & {
  floorDate: string;
  contributions: Map<string, Contribution>;
};

function emptyAggregate(): Aggregate {
  return {
    visibleActions: 0,
    distinctLocations: 0,
    wasteKg: 0,
    butts: 0,
    participants: 0,
    durationMinutes: 0,
    distribution: new Map(),
    warnings: new Map(),
    locations: new Map(),
    conditions: new Map(),
  };
}

function isInWindow(state: State, contribution: Contribution): boolean {
  return contribution.eligible && contribution.actionDate >= state.floorDate;
}

function bump(map: Map<string, number>, key: string, delta: number): void {
  const next = (map.get(key) ?? 0) + delta;
  if (next < 0) {
    throw new Error(`negative counter for ${key}`);
  }
  if (next === 0) map.delete(key);
  else map.set(key, next);
}

function apply(state: State, contribution: Contribution, sign: 1 | -1): void {
  if (!isInWindow(state, contribution)) return;
  state.visibleActions += sign;
  state.distinctLocations += 0;
  state.wasteKg += sign * contribution.wasteKg;
  state.butts += sign * contribution.butts;
  state.participants += sign * contribution.participants;
  state.durationMinutes += sign * contribution.durationMinutes;
  bump(state.distribution, contribution.categoryKey, sign);
  if (contribution.warning) bump(state.warnings, contribution.warning, sign);
  if (contribution.condition && contribution.conditionButts > 0) {
    bump(state.conditions, contribution.condition, sign * contribution.conditionButts);
  }
  if (contribution.location) {
    const before = state.locations.get(contribution.location) ?? 0;
    bump(state.locations, contribution.location, sign);
    if (before === 0 && sign === 1) state.distinctLocations += 1;
    if (before === 1 && sign === -1) state.distinctLocations -= 1;
  }
}

function createState(floorDate: string): State {
  return { ...emptyAggregate(), floorDate, contributions: new Map() };
}

function insert(state: State, contribution: Contribution): void {
  state.contributions.set(contribution.actionId, contribution);
  apply(state, contribution, 1);
}

function replace(state: State, contribution: Contribution): void {
  const previous = state.contributions.get(contribution.actionId);
  if (previous) apply(state, previous, -1);
  state.contributions.set(contribution.actionId, contribution);
  apply(state, contribution, 1);
}

function remove(state: State, actionId: string): void {
  const previous = state.contributions.get(actionId);
  if (!previous) return;
  apply(state, previous, -1);
  state.contributions.delete(actionId);
}

function advanceFloor(state: State, floorDate: string): void {
  for (const contribution of state.contributions.values()) {
    if (
      contribution.eligible &&
      contribution.actionDate >= state.floorDate &&
      contribution.actionDate < floorDate
    ) {
      apply(state, contribution, -1);
    }
  }
  state.floorDate = floorDate;
}

function fullRebuild(contributions: Contribution[], floorDate: string): Aggregate {
  const state = createState(floorDate);
  for (const contribution of contributions) insert(state, contribution);
  return state;
}

function comparable(state: State | Aggregate) {
  return {
    visibleActions: state.visibleActions,
    distinctLocations: state.distinctLocations,
    wasteKg: state.wasteKg,
    butts: state.butts,
    participants: state.participants,
    durationMinutes: state.durationMinutes,
    distribution: Object.fromEntries(state.distribution),
    warnings: Object.fromEntries(state.warnings),
    conditions: Object.fromEntries(state.conditions),
  };
}

const baseA: Contribution = {
  actionId: "a",
  actionDate: "2026-09-01",
  eligible: true,
  location: "Paris",
  wasteKg: 2,
  butts: 100,
  participants: 1,
  durationMinutes: 30,
  categoryKey: "spontaneous:1",
  categoryLabel: "Solo",
  warning: null,
  condition: "propre",
  conditionButts: 100,
};

describe("public Impact incremental state reference model", () => {
  it("matches a complete rebuild through action mutations, expirations and deletion", () => {
    const state = createState("2025-09-08");
    const actions = new Map<string, Contribution>();
    const assertEquivalent = () => {
      expect(comparable(state)).toEqual(
        comparable(fullRebuild([...actions.values()], state.floorDate)),
      );
    };

    insert(state, baseA);
    actions.set("a", baseA);
    assertEquivalent();

    const changedA = {
      ...baseA,
      wasteKg: 5,
      butts: 240,
      participants: 5,
      durationMinutes: 90,
      categoryKey: "company",
      categoryLabel: "Entreprise",
    };
    replace(state, changedA);
    actions.set("a", changedA);
    assertEquivalent();

    const pendingA = { ...changedA, eligible: false };
    replace(state, pendingA);
    actions.set("a", pendingA);
    assertEquivalent();

    const hiddenA = { ...pendingA, eligible: true };
    replace(state, hiddenA);
    actions.set("a", hiddenA);
    assertEquivalent();

    const legacyA = {
      ...hiddenA,
      categoryKey: "other",
      categoryLabel: "Autres",
      warning: "missing_organizer_type",
    };
    replace(state, legacyA);
    actions.set("a", legacyA);
    assertEquivalent();

    const sharedLocationB: Contribution = {
      ...baseA,
      actionId: "b",
      location: "Paris",
      categoryKey: "association",
      categoryLabel: "Association",
      warning: null,
      condition: null,
      conditionButts: 0,
    };
    insert(state, sharedLocationB);
    actions.set("b", sharedLocationB);
    assertEquivalent();

    const movedOut = { ...legacyA, actionDate: "2024-01-01" };
    replace(state, movedOut);
    actions.set("a", movedOut);
    assertEquivalent();

    const movedIn = { ...movedOut, actionDate: "2026-08-01", eligible: true };
    replace(state, movedIn);
    actions.set("a", movedIn);
    assertEquivalent();

    advanceFloor(state, "2026-09-01");
    assertEquivalent();

    remove(state, "b");
    actions.delete("b");
    assertEquivalent();
    expect(state.visibleActions).toBe(0);
    expect(state.distribution).toEqual(new Map());
    expect(state.warnings).toEqual(new Map());
    expect(state.conditions).toEqual(new Map());
  });

  it("keeps force separate from rebuild semantics", () => {
    const state = createState("2025-09-08");
    insert(state, baseA);
    const before = comparable(state);
    advanceFloor(state, "2025-09-08");
    expect(comparable(state)).toEqual(before);
    expect(state.contributions.size).toBe(1);
  });
});
