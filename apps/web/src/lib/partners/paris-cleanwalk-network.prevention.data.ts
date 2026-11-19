import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
import { sanitizeAndDeduplicatePublicChannels } from "./paris-cleanwalk-network.channels";
import type { ParisCleanwalkActor } from "./paris-cleanwalk-network";

const ANNUAIRE_IDS = new Set(INITIAL_ANNUAIRE_ENTRIES.map((entry) => entry.id));

function requireAnnuaireId(id: string): string {
  if (!ANNUAIRE_IDS.has(id)) {
    throw new Error(
      `Expected canonical Annuaire ID "${id}" in INITIAL_ANNUAIRE_ENTRIES`,
    );
  }
  return id;
}

export const PARIS_PREVENTION_ACTORS_RAW: readonly ParisCleanwalkActor[] = [
  {
    id: requireAnnuaireId("asso-gestes-propres"),
    annuaireEntryId: "asso-gestes-propres",
    name: "Gestes Propres",
    category: "reseau_evenement",
    roles: ["relais"],
    ecosystemRoles: ["sensibilisation_prevention", "coordinateur_reseau"],
    publicLeader: null,
    officialWebsite: "https://www.gestespropres.com/organiser-un-cleanup",
    publicContact: {
      label: "Page organiser un cleanup Gestes Propres",
      url: "https://www.gestespropres.com/organiser-un-cleanup",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      {
        type: "site_officiel",
        label: "Organiser un cleanup (Gestes Propres)",
        url: "https://www.gestespropres.com/organiser-un-cleanup",
        provenance: {
          sourceLabel: "Gestes Propres",
          sourceUrl: "https://www.gestespropres.com/organiser-un-cleanup",
          verifiedAt: "2026-11-19",
          certainty: "verifie",
        },
      },
    ]),
    parisZone: {
      label: "National (relais et ressources mobilisables à Paris)",
      arrondissements: [],
      isIntramuros: false,
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "kit_ou_guide",
      summary:
        "Met à disposition des guides et kits de sensibilisation pour organiser des cleanups.",
      sourceUrl: "https://www.gestespropres.com/organiser-un-cleanup",
      certainty: "verifie",
    },
    activities: [
      "Campagnes nationales de prévention des déchets abandonnés et guides de cleanup",
    ],
    provenance: {
      sourceLabel: "Gestes Propres",
      sourceUrl: "https://www.gestespropres.com/organiser-un-cleanup",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: requireAnnuaireId("asso-1"),
    annuaireEntryId: "asso-1",
    organizerDirectoryId: "association-pikpik",
    name: "Pik Pik Environnement",
    category: "association_locale",
    roles: ["organisateur_effectif", "relais"],
    ecosystemRoles: ["sensibilisation_prevention", "organisateur_direct"],
    publicLeader: null,
    officialWebsite: "https://pikpik.org/pikpik-services-solidaires/",
    publicContact: {
      label: "Pik Pik Environnement — Services solidaires",
      url: "https://pikpik.org/pikpik-services-solidaires/",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      {
        type: "site_officiel",
        label: "Pik Pik Services solidaires",
        url: "https://pikpik.org/pikpik-services-solidaires/",
        provenance: {
          sourceLabel: "Pik Pik Environnement",
          sourceUrl: "https://pikpik.org/pikpik-services-solidaires/",
          verifiedAt: "2026-11-19",
          certainty: "verifie",
        },
      },
    ]),
    parisZone: {
      label: "Île-de-France & Paris (animations et sensibilisation)",
      arrondissements: [],
      isIntramuros: true,
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "non_attribue",
      summary: "Aucun prêt de matériel public sourcé pour des tiers.",
      certainty: "verifie",
    },
    activities: [
      "Éducation à l'environnement, sensibilisation zéro déchet et ateliers citoyens",
    ],
    provenance: {
      sourceLabel: "Pik Pik Environnement",
      sourceUrl: "https://pikpik.org/pikpik-services-solidaires/",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: requireAnnuaireId("asso-megots-alcome"),
    annuaireEntryId: "asso-megots-alcome",
    name: "ALCOME",
    category: "reseau_evenement",
    roles: ["relais"],
    ecosystemRoles: ["sensibilisation_prevention"],
    publicLeader: null,
    officialWebsite: "https://filieres-rep.ademe.fr/filieres-REP/filiere-TABAC",
    publicContact: {
      label: "Fiche filière REP Tabac — ADEME",
      url: "https://filieres-rep.ademe.fr/filieres-REP/filiere-TABAC",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      {
        type: "site_officiel",
        label: "Filière REP Tabac (ADEME)",
        url: "https://filieres-rep.ademe.fr/filieres-REP/filiere-TABAC",
        provenance: {
          sourceLabel: "ADEME — Filières REP",
          sourceUrl: "https://filieres-rep.ademe.fr/filieres-REP/filiere-TABAC",
          verifiedAt: "2026-11-19",
          certainty: "verifie",
        },
      },
    ]),
    parisZone: {
      label: "National (éco-organisme agréé filière mégots)",
      arrondissements: [],
      isIntramuros: false,
    },
    participationModalities: ["entreprises_rse"],
    equipmentAvailability: {
      status: "non_attribue",
      summary: "Éco-organisme REP : pas de prêt direct de matériel grand public sourcé ici.",
      certainty: "verifie",
    },
    activities: [
      "Prévention et réduction des mégots jetés dans l'espace public (filière REP tabac)",
    ],
    provenance: {
      sourceLabel: "ADEME — Filières REP",
      sourceUrl: "https://filieres-rep.ademe.fr/filieres-REP/filiere-TABAC",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "asso-zerowaste-france",
    name: "Zero Waste France",
    category: "reseau_evenement",
    roles: ["relais"],
    ecosystemRoles: ["sensibilisation_prevention", "coordinateur_reseau"],
    publicLeader: null,
    officialWebsite: "https://www.zerowastefrance.org/lassociation/missions/",
    publicContact: {
      label: "Missions de Zero Waste France",
      url: "https://www.zerowastefrance.org/lassociation/missions/",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      {
        type: "site_officiel",
        label: "Zero Waste France — Missions",
        url: "https://www.zerowastefrance.org/lassociation/missions/",
        provenance: {
          sourceLabel: "Zero Waste France",
          sourceUrl: "https://www.zerowastefrance.org/lassociation/missions/",
          verifiedAt: "2026-11-19",
          certainty: "verifie",
        },
      },
    ]),
    parisZone: {
      label: "National (plaidoyer et réseau de groupes locaux)",
      arrondissements: [],
      isIntramuros: false,
    },
    participationModalities: ["benevoles", "scolaires"],
    equipmentAvailability: {
      status: "non_attribue",
      summary: "Association de plaidoyer et de prévention : pas de prêt de matériel sourcé.",
      certainty: "verifie",
    },
    activities: [
      "Plaidoyer, sensibilisation et réduction des déchets à la source (distincte de Zero Waste Paris)",
    ],
    provenance: {
      sourceLabel: "Zero Waste France",
      sourceUrl: "https://www.zerowastefrance.org/lassociation/missions/",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "asso-maison-zero-dechet",
    name: "Maison du Zéro Déchet",
    category: "association_locale",
    roles: ["relais"],
    ecosystemRoles: ["sensibilisation_prevention"],
    publicLeader: null,
    officialWebsite: "https://lamaisonduzerodechet.org/association/",
    publicContact: {
      label: "Maison du Zéro Déchet — L'association",
      url: "https://lamaisonduzerodechet.org/association/",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      {
        type: "site_officiel",
        label: "Maison du Zéro Déchet",
        url: "https://lamaisonduzerodechet.org/association/",
        provenance: {
          sourceLabel: "Maison du Zéro Déchet",
          sourceUrl: "https://lamaisonduzerodechet.org/association/",
          verifiedAt: "2026-11-19",
          certainty: "verifie",
        },
      },
    ]),
    parisZone: {
      label: "Paris 12e arrondissement",
      arrondissements: [12],
      isIntramuros: true,
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "non_attribue",
      summary: "Lieu ressource et ateliers de sensibilisation sans prêt de matériel de ramassage sourcé.",
      certainty: "verifie",
    },
    activities: [
      "Lieu ressource parisien dédié à la sensibilisation et à la réduction des déchets",
    ],
    provenance: {
      sourceLabel: "Maison du Zéro Déchet",
      sourceUrl: "https://lamaisonduzerodechet.org/association/",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "asso-no-plastic-in-my-sea",
    organizerDirectoryId: "association-no-plastic-in-my-sea",
    name: "No Plastic In My Sea",
    category: "reseau_evenement",
    roles: ["relais"],
    ecosystemRoles: ["sensibilisation_prevention"],
    publicLeader: null,
    officialWebsite: "https://noplasticinmysea.org/lassociation/",
    publicContact: {
      label: "No Plastic In My Sea — L'association",
      url: "https://noplasticinmysea.org/lassociation/",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      {
        type: "site_officiel",
        label: "No Plastic In My Sea",
        url: "https://noplasticinmysea.org/lassociation/",
        provenance: {
          sourceLabel: "No Plastic In My Sea",
          sourceUrl: "https://noplasticinmysea.org/lassociation/",
          verifiedAt: "2026-11-19",
          certainty: "verifie",
        },
      },
    ]),
    parisZone: {
      label: "National (campagnes de sensibilisation contre la pollution plastique)",
      arrondissements: [],
      isIntramuros: false,
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "non_attribue",
      summary: "Aucun prêt de matériel de collecte sourcé.",
      certainty: "verifie",
    },
    activities: [
      "Sensibilisation, campagnes et mobilisation contre la pollution plastique",
    ],
    provenance: {
      sourceLabel: "No Plastic In My Sea",
      sourceUrl: "https://noplasticinmysea.org/lassociation/",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "asso-aremacs-idf",
    name: "AREMACS (Île-de-France / Paris)",
    category: "association_locale",
    roles: ["relais"],
    ecosystemRoles: ["sensibilisation_prevention"],
    publicLeader: null,
    officialWebsite: "https://www.aremacs.com/association",
    publicContact: {
      label: "AREMACS — L'association",
      url: "https://www.aremacs.com/association",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      {
        type: "site_officiel",
        label: "AREMACS",
        url: "https://www.aremacs.com/association",
        provenance: {
          sourceLabel: "AREMACS",
          sourceUrl: "https://www.aremacs.com/association",
          verifiedAt: "2026-11-19",
          certainty: "verifie",
        },
      },
    ]),
    parisZone: {
      label: "Île-de-France / Paris (antenne régionale)",
      arrondissements: [],
      isIntramuros: true,
    },
    participationModalities: ["benevoles", "entreprises_rse"],
    equipmentAvailability: {
      status: "non_attribue",
      summary: "Accompagnement événementiel et tri sans prêt de matériel de cleanwalk sourcé.",
      certainty: "verifie",
    },
    activities: [
      "Prévention, tri et gestion des déchets lors d'événements en Île-de-France et à Paris",
    ],
    provenance: {
      sourceLabel: "AREMACS",
      sourceUrl: "https://www.aremacs.com/association",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "collectivite-syctom",
    name: "Syctom",
    category: "collectivite_mairie",
    roles: ["relais"],
    ecosystemRoles: ["sensibilisation_prevention"],
    publicLeader: null,
    officialWebsite: "https://www.syctom-paris.fr/prevention-et-sensibilisation.html",
    publicContact: {
      label: "Syctom — Prévention et sensibilisation",
      url: "https://www.syctom-paris.fr/prevention-et-sensibilisation.html",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      {
        type: "site_officiel",
        label: "Syctom — Prévention",
        url: "https://www.syctom-paris.fr/prevention-et-sensibilisation.html",
        provenance: {
          sourceLabel: "Syctom",
          sourceUrl: "https://www.syctom-paris.fr/prevention-et-sensibilisation.html",
          verifiedAt: "2026-11-19",
          certainty: "verifie",
        },
      },
    ]),
    parisZone: {
      label: "Métropole francilienne et Paris (service public des déchets)",
      arrondissements: [],
      isIntramuros: true,
    },
    participationModalities: ["scolaires", "benevoles"],
    equipmentAvailability: {
      status: "non_attribue",
      summary: "Acteur public territorial de traitement et de prévention, sans prêt de matériel de cleanwalk sourcé.",
      certainty: "verifie",
    },
    activities: [
      "Prévention, sensibilisation au tri et réduction des déchets ménagers sur le territoire parisien",
    ],
    provenance: {
      sourceLabel: "Syctom",
      sourceUrl: "https://www.syctom-paris.fr/prevention-et-sensibilisation.html",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "eco-organisme-citeo",
    name: "Citeo",
    category: "reseau_evenement",
    roles: ["relais"],
    ecosystemRoles: ["sensibilisation_prevention"],
    publicLeader: null,
    officialWebsite: "https://www.citeo.com/nous-connaitre/",
    publicContact: {
      label: "Citeo — Nous connaître",
      url: "https://www.citeo.com/nous-connaitre/",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      {
        type: "site_officiel",
        label: "Citeo",
        url: "https://www.citeo.com/nous-connaitre/",
        provenance: {
          sourceLabel: "Citeo",
          sourceUrl: "https://www.citeo.com/nous-connaitre/",
          verifiedAt: "2026-11-19",
          certainty: "verifie",
        },
      },
    ]),
    parisZone: {
      label: "National (éco-organisme emballages et papiers)",
      arrondissements: [],
      isIntramuros: false,
    },
    participationModalities: ["entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "non_attribue",
      summary: "Éco-organisme national : pas de prêt direct de matériel de ramassage sourcé.",
      certainty: "verifie",
    },
    activities: [
      "Éco-organisme dédié à la réduction, au réemploi, au tri et au recyclage des emballages et papiers",
    ],
    provenance: {
      sourceLabel: "Citeo",
      sourceUrl: "https://www.citeo.com/nous-connaitre/",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
] as const;
