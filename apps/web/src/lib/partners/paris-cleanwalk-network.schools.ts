import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
import type { ParisCleanwalkActor } from "./paris-cleanwalk-network";

export const PARIS_SCHOOL_ACTORS: ParisCleanwalkActor[] = INITIAL_ANNUAIRE_ENTRIES.flatMap(entry => {
  if (entry.kind !== "etablissement_enseignement" || entry.provenance !== "editorial_seed") return [];
  const school = entry.schoolProfile;
  if (!school || !entry.websiteUrl || !school.sources[0]) return [];
  return [{
    id: entry.id, annuaireEntryId: entry.id, name: entry.name, category: "etablissement_enseignement",
    roles: [], ecosystemRoles: [], publicLeader: null, schoolProfile: school, officialWebsite: entry.websiteUrl,
    publicContact: { label: entry.primaryChannel?.label ?? "Fiche officielle", url: entry.websiteUrl, certainty: "verifie" },
    publicChannels: school.sources.map(source => ({
      type: "autre_public" as const, label: source.label, url: source.url,
      provenance: { sourceLabel: source.label, sourceUrl: source.url, verifiedAt: school.verifiedAt, certainty: "verifie" as const },
    })),
    parisZone: { label: entry.location, arrondissements: [...entry.coveredArrondissements], isIntramuros: true },
    participationModalities: ["scolaires"], equipmentAvailability: { status: "incertain", summary: "Matériel non renseigné.", certainty: "partiel_ou_incertain" },
    activities: [entry.description], provenance: { sourceLabel: school.sources[0].label, sourceUrl: school.sources[0].url, secondarySourceUrl: school.sources[1]?.url, certainty: "verifie" },
    verifiedAt: school.verifiedAt, isCleanMyMapMember: false,
  } satisfies ParisCleanwalkActor];
});
