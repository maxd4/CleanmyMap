import { describe, expect, it } from "vitest";
import { getPublicInstitutionalPeople } from "./public-cleanliness-people";
import { PARIS_PUBLIC_CLEANLINESS_DATASET, type PublicCleanlinessCityDataset } from "./public-cleanliness-organization";

const node = (id: string, kind: PublicCleanlinessCityDataset["nodes"][number]["kind"]) => ({
  id, kind, name: id, territoryIds: ["Paris:20"], service: "cleaning" as const,
  assignment: "confirmed" as const, description: "Fixture", sourceIds: ["fixture"],
});
const edge = (from: string, to: string, kind: PublicCleanlinessCityDataset["relations"][number]["kind"], status: PublicCleanlinessCityDataset["relations"][number]["status"] = "confirmed") => ({
  id: `${kind}:${from}:${to}`, from, to, kind, status, sourceIds: ["fixture"],
});
const data: PublicCleanlinessCityDataset = {
  ...PARIS_PUBLIC_CLEANLINESS_DATASET,
  nodes: [node("division", "unit"), node("unit", "unit"), node("role-a", "position"), node("role-b", "position"), node("other-role", "position"), node("person-a", "person"), node("person-b", "person"), node("person-c", "person")],
  relations: [edge("division", "unit", "hierarchy"), edge("unit", "role-a", "hierarchy"), edge("unit", "role-b", "hierarchy"), edge("person-a", "role-a", "assignment"), edge("person-a", "role-b", "assignment", "historical"), edge("person-b", "other-role", "assignment"), edge("person-c", "role-a", "assignment", "unknown"), edge("division", "other-role", "coordination")],
};
describe("public institutional people", () => {
  it("finds one stable identity through two documented assignments below a division", () => {
    const result = getPublicInstitutionalPeople(data, "division");
    expect(result.map(({ person }) => person.id)).toEqual(["person-a"]);
    expect(result[0]?.assignments.map(({ relation }) => relation.status)).toEqual(["confirmed", "historical"]);
  });
  it("does not infer membership from geography, coordination or an unknown assignment", () => {
    expect(getPublicInstitutionalPeople(data, "other-role").map(({ person }) => person.id)).toEqual(["person-b"]);
    expect(getPublicInstitutionalPeople(data, "role-a").map(({ person }) => person.id)).toEqual(["person-a"]);
    expect(getPublicInstitutionalPeople(data, "missing")).toEqual([]);
    expect(getPublicInstitutionalPeople(data, "person-a")).toEqual([]);
  });
  it("preserves the existing political identities and documented cabinet appointment", () => {
    const { nodes, relations, sources } = PARIS_PUBLIC_CLEANLINESS_DATASET;
    expect(nodes.filter(({ id }) => id === "person-carine-ekon")).toHaveLength(1);
    expect(nodes.filter(({ id }) => id === "person-pierre-lombard")).toHaveLength(1);
    expect(nodes.some(({ id }) => id === "person-wanda-schneider")).toBe(false);
    expect(relations).toContainEqual(expect.objectContaining({ from: "person-augustin-hassoux", to: "deputy-waste-cabinet-chief", kind: "assignment" }));
    expect(sources).toContainEqual(expect.objectContaining({ id: "augustin-hassoux-cabinet-2026", evidence: "professional_self_statement" }));
  });
});
