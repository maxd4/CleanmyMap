import type { ParisCleanwalkActor } from "./paris-cleanwalk-network";
import { createVerifiedChannel } from "./paris-cleanwalk-network.channels";

const verifiedAt = "2026-11-25";

type ActorSeed = Pick<ParisCleanwalkActor, "id" | "name" | "category" | "roles" | "ecosystemRoles" | "parisZone" | "participationModalities" | "activities"> & { website: string; sourceUrl: string; secondarySourceUrl?: string; annuaireEntryId?: string };

function createActor({ website, sourceUrl, secondarySourceUrl, ...seed }: ActorSeed): ParisCleanwalkActor {
  return {
    ...seed,
    publicLeader: null,
    officialWebsite: website,
    publicContact: { label: "Site officiel", url: website, certainty: "verifie" },
    publicChannels: [{ ...createVerifiedChannel("site_officiel", "Site officiel", website, seed.name, sourceUrl), provenance: { sourceLabel: seed.name, sourceUrl, verifiedAt, certainty: "verifie" } }],
    equipmentAvailability: { status: "incertain", summary: "Conditions de matériel, collecte et accès à confirmer ; aucun prêt ou traitement de lot acquis.", certainty: "partiel_ou_incertain" },
    provenance: { sourceLabel: seed.name + " : présentation et activité publique", sourceUrl, secondarySourceUrl, certainty: "verifie" },
    verifiedAt,
    isCleanMyMapMember: false,
  };
}

export const PARIS_MEGOTS_ACTORS: readonly ParisCleanwalkActor[] = [
  createActor({
    id: "wings-of-the-ocean", name: "Wings of the Ocean", category: "association_locale",
    roles: ["organisateur_effectif", "relais"], ecosystemRoles: ["organisateur_direct", "coordinateur_reseau"],
    website: "https://www.wingsoftheocean.com/nos-missions/nos-antennes/",
    sourceUrl: "https://www.wingsoftheocean.com/nos-missions/nos-antennes/",
    secondarySourceUrl: "https://lemegothon.fr/qui-sommes-nous/",
    parisZone: { label: "Association nationale avec antenne Paris documentée", arrondissements: [], isIntramuros: true, scopeNote: "Le rôle au sein du collectif Mégothon concerne l'association nationale, non chaque antenne." },
    participationModalities: ["benevoles"], activities: ["Actions locales de dépollution et sensibilisation ; membre du collectif Mégothon annoncé en 2026."],
  }),
  createActor({
    id: "lopp", name: "Ludovic Objectif Planète Propre (LOPP)", category: "association_locale",
    roles: ["organisateur_effectif", "relais"], ecosystemRoles: ["organisateur_direct", "coordinateur_reseau"],
    website: "https://ludovicobjectifplanetepropre.org/",
    sourceUrl: "https://ludovicobjectifplanetepropre.org/nettoyages-environnementaux/",
    secondarySourceUrl: "https://lemegothon.fr/cgu/",
    parisZone: { label: "Actions à Paris et défis nationaux", arrondissements: [], isIntramuros: true },
    participationModalities: ["benevoles"], activities: ["Dépollution citoyenne ; membre du collectif et éditeur déclaré de la plateforme Mégothon en 2026."],
  }),
  createActor({
    id: "trash-spotter", name: "Trash Spotter", category: "plateforme_mise_en_relation",
    roles: ["relais"], ecosystemRoles: ["plateforme_publication"],
    website: "https://trash-spotter.green/",
    sourceUrl: "https://trash-spotter.green/record-du-monde-de-ramassage-de-megots-2023-trash-spotter/",
    secondarySourceUrl: "https://trash-spotter.green/wp-content/Megothon/Megothon_2025_Bilan_complet.pdf",
    parisZone: { label: "Plateforme nationale ; suivi des opérations de 2023 incluant Paris", arrondissements: [], isIntramuros: true, scopeNote: "Aucune localisation précise des collectes ni rôle technique 2026 déduit." },
    participationModalities: ["benevoles"], activities: ["Cartographie et remontée de résultats de collectes ; accompagnement technique historique du Mégothon."],
  }),
  createActor({
    id: "asso-megots-cyclope", annuaireEntryId: "asso-megots-cyclope", name: "Cy-Clope", category: "entreprise_rse",
    roles: [], ecosystemRoles: [],
    website: "https://www.cy-clope.com/",
    sourceUrl: "https://www.cy-clope.com/valorisation-des-megots/",
    secondarySourceUrl: "https://cdn.paris.fr/paris/2025/04/16/032025-compte-rendu-conseil-de-quartier-gambetta-mars-25-wftw.pdf",
    parisZone: { label: "Offre Île-de-France et coopération locale documentée en 2025", arrondissements: [], isIntramuros: true },
    participationModalities: [], activities: ["Collecte spécialisée et valorisation énergétique annoncée ; dispositif Récolte Citadine cité avec Brigade Verte en mars 2025."],
  }),
  createActor({
    id: "operator-ckfd", name: "CKFD", category: "entreprise_rse",
    roles: [], ecosystemRoles: [],
    website: "https://www.ckfd.fr/recyclage-dechets/megot-de-cigarette",
    sourceUrl: "https://www.ckfd.fr/recyclage-dechets/megot-de-cigarette",
    secondarySourceUrl: "https://trash-spotter.green/wp-content/Megothon/Megothon_2025_Bilan_complet.pdf",
    parisZone: { label: "Collecte francilienne ; regroupement annoncé à Gennevilliers", arrondissements: [], isIntramuros: false },
    participationModalities: [], activities: ["Collecte, massification et acheminement vers une filière de recyclage en Bretagne selon l'opérateur."],
  }),
  createActor({
    id: "operator-mego", name: "MéGO!", category: "entreprise_rse",
    roles: [], ecosystemRoles: [],
    website: "https://www.me-go.fr/",
    sourceUrl: "https://www.me-go.fr/a-propos/",
    secondarySourceUrl: "https://www.ckfd.fr/recyclage-dechets/megot-de-cigarette",
    parisZone: { label: "Finistère ; filière aval annoncée pour les collectes CKFD", arrondissements: [], isIntramuros: false },
    participationModalities: [], activities: ["Recyclage matière annoncé par l'entreprise ; ne constitue pas un dépôt public en région parisienne."],
  }),
  createActor({
    id: "operator-carton-plein-cyclo", name: "Carton Plein Cyclo", category: "entreprise_rse",
    roles: [], ecosystemRoles: [],
    website: "https://cartonplein.org/nos-services-cyclologistique/",
    sourceUrl: "https://cartonplein.org/nos-services-cyclologistique/collecte-de-dechets-a-paris-et-en-proche-banlieue/",
    secondarySourceUrl: "https://cartonplein.org/wp-content/uploads/2025/04/RA-2023-Carton-Plein.pdf",
    parisZone: { label: "Paris et proche banlieue ; entreprise d'insertion", arrondissements: [], isIntramuros: true, scopeNote: "Offre professionnelle ; admission des mégots citoyens et trajet à confirmer." },
    participationModalities: [], activities: ["Collecte de déchets à vélo cargo et insertion professionnelle ; mégots cités dans le rapport 2023. Aucun accord de transport CleanMyMap établi."],
  }),
  createActor({
    id: "asso-runners-laveurs", name: "Les Runners Laveurs", category: "association_locale",
    roles: ["organisateur_effectif"], ecosystemRoles: ["organisateur_direct", "sensibilisation_prevention"],
    website: "https://www.helloasso.com/associations/les-runners-laveurs",
    sourceUrl: "https://www.fondationdelamer.org/nos-programmes/un-geste-pour-la-mer/associations/les-runners-laveurs/",
    secondarySourceUrl: "https://www.helloasso.com/associations/les-runners-laveurs",
    parisZone: { label: "Île-de-France ; plogging documenté", arrondissements: [], isIntramuros: true, scopeNote: "La fiche cite un plogging avec les 20 km de Paris ; fréquence et itinéraires actuels non établis." },
    participationModalities: ["benevoles"], activities: ["Sorties de collecte en courant ou en marchant ; aucune participation à un programme CleanMyMap acquise."],
  }),
];
