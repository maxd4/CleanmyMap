import type { AnnuaireEntrySeedInput } from "@/lib/partners/annuaire-types";

export const GROUPES_PAROLE_ENTRIES: AnnuaireEntrySeedInput[] = [
  {
    id: "collectif-1",
    name: "Cercle de parole - Eco-anxiété",
    legalIdentity: "Collectif eco-anxiété Paris (déclaration en cours)",
    kind: "groupe_parole",
    types: ["social", "environnemental"],
    description:
      "Collectif itinérant pour échanger sur les émotions liées à la crise climatique.",
    location: "Paris itinérant",
    lat: 48.865,
    lng: 2.34,
    coveredArrondissements: [5, 6, 11, 12, 13],
    contributionTypes: ["accueil", "communication"],
    availability: "1 fois par semaine, en soirée",
    lastUpdatedAt: "2026-03-02",
  },
];
