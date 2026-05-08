import type { AnnuaireEntry } from "../annuaire-map-canvas";
import { ASSOCIATIONS_ENTRIES } from "./seed-associations";
import { ENTREPRISES_ENTRIES } from "./seed-entreprises";
import { EVENEMENTS_ENTRIES } from "./seed-evenements";
import { GROUPES_PAROLE_ENTRIES } from "./seed-groupes-parole";

function validateUniqueIds(entries: AnnuaireEntry[]): void {
  const ids = new Set<string>();
  const duplicates: string[] = [];

  for (const entry of entries) {
    if (ids.has(entry.id)) {
      duplicates.push(entry.id);
    }
    ids.add(entry.id);
  }

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate IDs found in annuaire entries: ${duplicates.join(", ")}`
    );
  }
}

const allEntries = [
  ...ASSOCIATIONS_ENTRIES,
  ...ENTREPRISES_ENTRIES,
  ...EVENEMENTS_ENTRIES,
  ...GROUPES_PAROLE_ENTRIES,
];

validateUniqueIds(allEntries);

export const INITIAL_ANNUAIRE_ENTRIES: AnnuaireEntry[] = allEntries;
