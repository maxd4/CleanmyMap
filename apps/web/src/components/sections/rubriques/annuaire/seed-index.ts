import type {
  AnnuaireEntrySeedInput,
  EditorialAnnuaireEntry,
} from "@/lib/partners/annuaire-types";
import { ASSOCIATIONS_ENTRIES } from "./seed-associations";
import { ENTREPRISES_ENTRIES } from "./seed-entreprises";
import { EVENEMENTS_ENTRIES } from "./seed-evenements";
import { GROUPES_PAROLE_ENTRIES } from "./seed-groupes-parole";

function validateUniqueIds(entries: AnnuaireEntrySeedInput[]): void {
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

const allEntries: AnnuaireEntrySeedInput[] = [
  ...ASSOCIATIONS_ENTRIES,
  ...ENTREPRISES_ENTRIES,
  ...EVENEMENTS_ENTRIES,
  ...GROUPES_PAROLE_ENTRIES,
];

validateUniqueIds(allEntries);

function toEditorialAnnuaireEntry(
  entry: AnnuaireEntrySeedInput,
): EditorialAnnuaireEntry {
  return {
    ...entry,
    provenance: "editorial_seed",
    verificationStatus: "en_cours",
    qualificationStatus: "contact_non_qualifie",
  };
}

export const INITIAL_ANNUAIRE_ENTRIES: EditorialAnnuaireEntry[] =
  allEntries.map(toEditorialAnnuaireEntry);
