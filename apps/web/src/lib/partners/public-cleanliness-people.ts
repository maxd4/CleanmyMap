import type {
  PublicCleanlinessCityDataset,
  PublicCleanlinessOrganizationNode,
  PublicCleanlinessOrganizationRelation,
} from "./public-cleanliness-organization";

type Assignment = {
  role: PublicCleanlinessOrganizationNode;
  relation: PublicCleanlinessOrganizationRelation;
  status: "confirmed" | "historical";
};

type InstitutionalPerson = {
  person: PublicCleanlinessOrganizationNode;
  assignments: Assignment[];
};

/** Follow only administrative hierarchy, never territory overlap or coordination. */
export function getPublicInstitutionalPeople(
  dataset: PublicCleanlinessCityDataset,
  selectedId: string,
): InstitutionalPerson[] {
  const nodes = new Map(dataset.nodes.map((node) => [node.id, node]));
  if (!nodes.has(selectedId) || nodes.get(selectedId)?.kind === "person") return [];
  const children = new Map<string, PublicCleanlinessOrganizationRelation[]>();
  for (const edge of dataset.relations) {
    if (edge.kind !== "hierarchy" || edge.status === "unknown") continue;
    const ids = children.get(edge.from) ?? [];
    ids.push(edge);
    children.set(edge.from, ids);
  }
  const descendants = new Map<string, boolean>();
  const pending = [{ id: selectedId, historical: false }];
  while (pending.length) {
    const { id, historical } = pending.pop()!;
    if (descendants.has(id) || nodes.get(id)?.assignment === "unknown") continue;
    const pathHistorical = historical || nodes.get(id)?.assignment === "historical";
    descendants.set(id, pathHistorical);
    for (const edge of children.get(id) ?? []) {
      pending.push({ id: edge.to, historical: pathHistorical || edge.status === "historical" });
    }
  }
  const people = new Map<string, InstitutionalPerson>();
  for (const relation of dataset.relations) {
    if ((relation.kind !== "assignment" && relation.kind !== "mandate") ||
        relation.status === "unknown" || !descendants.has(relation.to)) continue;
    const person = nodes.get(relation.from);
    const role = nodes.get(relation.to);
    if (person?.kind !== "person" || person.assignment === "unknown" || !role || role.kind === "person" || role.assignment === "unknown") continue;
    const entry = people.get(person.id) ?? { person, assignments: [] };
    const status = descendants.get(role.id) || person.assignment === "historical" || role.assignment === "historical" || relation.status === "historical" ? "historical" : "confirmed";
    entry.assignments.push({ role, relation, status });
    people.set(person.id, entry);
  }
  return [...people.values()].sort((a, b) => a.person.name.localeCompare(b.person.name, "fr"));
}
