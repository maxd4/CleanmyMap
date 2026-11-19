import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
import {
  createVerifiedChannel as channel,
  sanitizeAndDeduplicatePublicChannels,
} from "./paris-cleanwalk-network.channels";
import type { ParisCleanwalkActor } from "./paris-cleanwalk-network";
import { PARIS_PREVENTION_ACTORS_RAW } from "./paris-cleanwalk-network.prevention.data";

const ANNUAIRE_IDS = new Set(INITIAL_ANNUAIRE_ENTRIES.map((entry) => entry.id));
const ALL_PARIS_ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => i + 1);

function requireAnnuaireId(id: string): string {
  if (!ANNUAIRE_IDS.has(id)) {
    throw new Error(
      `Expected canonical Annuaire ID "${id}" in INITIAL_ANNUAIRE_ENTRIES`,
    );
  }
  return id;
}

export const PARIS_CLEANWALK_ACTORS: readonly ParisCleanwalkActor[] = [
  {
    id: requireAnnuaireId("asso-featured-1"),
    annuaireEntryId: "asso-featured-1",
    organizerDirectoryId: "association-brigade-verte-paris",
    name: "Brigade Verte Paris",
    category: "association_locale",
    roles: ["organisateur_effectif", "relais"],
    ecosystemRoles: ["organisateur_direct"],
    publicLeader: {
      name: "Thomas Saint-Aubin",
      roleTitle: "Co-fondateur (avec Françoise Mallet et Claire Emmanuel)",
      sourceUrl: "https://www.helloasso.com/associations/association-brigade-verte",
      verifiedAt: "2026-11-19",
    },
    officialWebsite: "https://brigadeverteparis.fr",
    publicContact: {
      label: "Formulaire & page HelloAsso",
      url: "https://www.helloasso.com/associations/association-brigade-verte",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Site officiel Brigade Verte Paris", "https://brigadeverteparis.fr", "brigadeverteparis.fr"),
      channel("plateforme_jagis", "Fiche J'agis pour la nature", "https://www.jagispourlanature.org/structure/brigade-verte-paris", "jagispourlanature.org"),
      channel("plateforme_helloasso", "Adhésion & page HelloAsso", "https://www.helloasso.com/associations/association-brigade-verte", "helloasso.com"),
      channel("reseau_facebook", "Page Facebook Brigade Verte Paris 19", "https://www.facebook.com/BrigadeVerte19/", "Seed Annuaire éditorial"),
    ]),
    parisZone: {
      label: "Paris Est (11e, 19e, 20e)",
      arrondissements: [11, 19, 20],
      isIntramuros: true,
      scopeNote:
        "Opérations Quartier Propre documentées dans les 11e, 19e et 20e arrondissements (distincte de « Super Brigade Verte » des Parques).",
    },
    participationModalities: ["benevoles", "entreprises_rse"],
    equipmentAvailability: {
      status: "incertain",
      summary:
        "Matériel mobilisé lors des opérations encadrées ; aucun prêt autonome aux tiers attribué sans preuve dédiée.",
      certainty: "partiel_ou_incertain",
    },
    activities: [
      "Opérations Quartier Propre et cleanwalks urbaines dans l'Est parisien",
      "Sensibilisation aux déchets sauvages et mégots",
    ],
    provenance: {
      sourceLabel: "brigadeverteparis.fr, HelloAsso & J'agis pour la nature",
      sourceUrl: "https://brigadeverteparis.fr",
      secondarySourceUrl:
        "https://www.jagispourlanature.org/structure/brigade-verte-paris",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: requireAnnuaireId("asso-surfrider-paris"),
    annuaireEntryId: "asso-surfrider-paris",
    organizerDirectoryId: "association-surfrider",
    name: "Surfrider Paris",
    category: "association_locale",
    roles: ["organisateur_effectif", "relais"],
    ecosystemRoles: ["organisateur_direct", "sensibilisation_prevention"],
    publicLeader: null,
    officialWebsite: "https://surfrider-paris.fr/nos-actions",
    publicContact: {
      label: "Page actions antenne Paris",
      url: "https://surfrider-paris.fr/nos-actions",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Actions Surfrider Paris", "https://surfrider-paris.fr/nos-actions", "surfrider-paris.fr"),
      channel("reseau_instagram", "Instagram @surfriderparis", "https://www.instagram.com/surfriderparis/", "Seed Annuaire éditorial"),
    ]),
    parisZone: {
      label: "Paris (berges de Seine & arrondissements centraux)",
      arrondissements: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      isIntramuros: true,
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "non_attribue",
      summary:
        "Pas de prêt de matériel aux tiers attribué sans convention d'opération.",
      certainty: "verifie",
    },
    activities: [
      "Collectes urbaines et Initiatives Océanes sur les berges de Seine",
      "Sensibilisation scolaire et team-building RSE Surfrider",
    ],
    provenance: {
      sourceLabel: "surfrider-paris.fr/nos-actions",
      sourceUrl: "https://surfrider-paris.fr/nos-actions",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: requireAnnuaireId("asso-zerowaste-paris"),
    annuaireEntryId: "asso-zerowaste-paris",
    name: "Zero Waste Paris",
    category: "association_locale",
    roles: ["organisateur_effectif", "relais"],
    ecosystemRoles: [
      "organisateur_direct",
      "coordinateur_reseau",
      "sensibilisation_prevention",
    ],
    publicLeader: null,
    officialWebsite: "https://www.zerowasteparis.fr/nos-actions",
    publicContact: {
      label: "Site Zero Waste Paris",
      url: "https://www.zerowasteparis.fr/nos-actions",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Actions Zero Waste Paris", "https://www.zerowasteparis.fr/nos-actions", "zerowasteparis.fr"),
      channel("reseau_instagram", "Instagram @zerowasteparis", "https://www.instagram.com/zerowasteparis/", "zerowasteparis.fr"),
      channel(
        "plateforme_jeveuxaider",
        "Missions sur JeVeuxAider.gouv.fr",
        "https://www.jeveuxaider.gouv.fr/organisations/16300-zero-waste-paris",
        "jeveuxaider.gouv.fr",
        "https://www.jeveuxaider.gouv.fr/organisations/16300-zero-waste-paris",
        "verifie",
      ),
    ]),
    parisZone: {
      label: "Tout Paris intramuros (1er–20e)",
      arrondissements: ALL_PARIS_ARRONDISSEMENTS,
      isIntramuros: true,
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "non_attribue",
      summary:
        "Activité centrée sur la réduction à la source et le plaidoyer ; aucun prêt de matériel de collecte attribué.",
      certainty: "verifie",
    },
    activities: [
      "Ateliers zéro déchet, sensibilisation et plaidoyer local à Paris",
      "Interventions en milieu scolaire et auprès des organisations",
    ],
    provenance: {
      sourceLabel: "zerowasteparis.fr/nos-actions",
      sourceUrl: "https://www.zerowasteparis.fr/nos-actions",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "cleanwalker-paris",
    organizerDirectoryId: "association-cleanwalker",
    name: "Cleanwalker Paris",
    category: "association_locale",
    roles: ["organisateur_effectif", "relais"],
    ecosystemRoles: ["organisateur_direct"],
    publicLeader: null,
    officialWebsite: "https://cleanwalker.fr/antennes/paris",
    publicContact: {
      label: "Page antenne Paris Cleanwalker",
      url: "https://cleanwalker.fr/antennes/paris",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Antenne Paris Cleanwalker", "https://cleanwalker.fr/antennes/paris", "cleanwalker.fr"),
    ]),
    parisZone: {
      label: "Paris intramuros (antenne locale)",
      arrondissements: ALL_PARIS_ARRONDISSEMENTS,
      isIntramuros: true,
    },
    participationModalities: ["benevoles"],
    equipmentAvailability: {
      status: "incertain",
      summary:
        "Modalités de matériel propres à chaque sortie ; aucun prêt permanent aux tiers attribué sans preuve.",
      certainty: "partiel_ou_incertain",
    },
    activities: [
      "Marches citoyennes de ramassage de déchets à Paris",
      "Sensibilisation grand public sur le terrain",
    ],
    provenance: {
      sourceLabel: "cleanwalker.fr/antennes/paris",
      sourceUrl: "https://cleanwalker.fr/antennes/paris",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "the-clean-project",
    organizerDirectoryId: "association-the-clean-project",
    name: "The Clean Project",
    category: "association_locale",
    roles: ["organisateur_effectif", "relais"],
    ecosystemRoles: ["organisateur_direct"],
    publicLeader: {
      name: "Pierre-Ambroise Bosse",
      roleTitle: "Cofondateur",
      sourceUrl: "https://www.thecleanproject.fr",
      verifiedAt: "2026-11-19",
    },
    officialWebsite: "https://www.thecleanproject.fr",
    publicContact: {
      label: "Page de contact The Clean Project",
      url: "https://www.thecleanproject.fr",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Site officiel The Clean Project", "https://www.thecleanproject.fr", "thecleanproject.fr"),
    ]),
    parisZone: {
      label: "Paris (siège 15e, rassemblements Bastille / intramuros)",
      arrondissements: [4, 11, 12, 15],
      isIntramuros: true,
      scopeNote:
        "Siège social dans le 15e arrondissement ; événements documentés notamment Place de la Bastille.",
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "incertain",
      summary:
        "Équipement géré sur ses événements ; aucun prêt de matériel aux tiers attribué sans source dédiée.",
      certainty: "partiel_ou_incertain",
    },
    activities: [
      "Festivals éco-citoyens, défis sportifs (Éco-Games) et cleanups",
      "Mobilisation événementielle autour des mégots et déchets urbains",
    ],
    provenance: {
      sourceLabel: "thecleanproject.fr",
      sourceUrl: "https://www.thecleanproject.fr",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "ma-petite-planete",
    name: "Ma Petite Planète",
    category: "reseau_evenement",
    roles: ["relais", "organisateur_effectif"],
    ecosystemRoles: ["coordinateur_reseau", "organisateur_direct"],
    publicLeader: null,
    officialWebsite: "https://mapetiteplanete.org",
    publicContact: {
      label: "Portail Ma Petite Planète",
      url: "https://mapetiteplanete.org",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Portail Ma Petite Planète", "https://mapetiteplanete.org", "mapetiteplanete.org"),
    ]),
    parisZone: {
      label: "Réseau national actif à Paris (ligues citoyennes, écoles, entreprises)",
      arrondissements: [],
      isIntramuros: true,
      scopeNote:
        "Portée nationale avec participation active d'établissements et d'équipes à Paris.",
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "non_attribue",
      summary:
        "Dispositif de défis ludiques sans prêt de matériel physique attribué.",
      certainty: "verifie",
    },
    activities: [
      "Challenges écologiques intégrant des défis cleanwalk",
      "Volet gratuit MPP Scolaire et ligues entreprises RSE",
    ],
    provenance: {
      sourceLabel: "mapetiteplanete.org",
      sourceUrl: "https://mapetiteplanete.org",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "world-cleanup-day-france",
    organizerDirectoryId: "association-world-cleanup-day-france",
    name: "World Cleanup Day France",
    category: "reseau_evenement",
    roles: ["relais", "organisateur_effectif"],
    ecosystemRoles: ["coordinateur_reseau", "organisateur_direct"],
    publicLeader: {
      name: "Virginie Delugeard",
      roleTitle: "Présidente",
      sourceUrl: "https://www.worldcleanupday.fr/en-france/",
      verifiedAt: "2026-11-19",
    },
    officialWebsite: "https://www.worldcleanupday.fr",
    publicContact: {
      label: "Portail World Cleanup Day France",
      url: "https://www.worldcleanupday.fr",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Portail World Cleanup Day France", "https://www.worldcleanupday.fr", "worldcleanupday.fr"),
    ]),
    parisZone: {
      label: "Coordination nationale — points de collecte à Paris",
      arrondissements: [],
      isIntramuros: true,
      scopeNote: "Coordination nationale fédérant des collectes locales à Paris.",
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "kit_ou_guide",
      summary:
        "Met à disposition des kits de communication et guides d'organisation numériques ; pas de prêt matériel physique universel attribué.",
      items: ["Guides d'organisation", "Affiches et kits de sensibilisation"],
      sourceUrl: "https://www.worldcleanupday.fr",
      certainty: "verifie",
    },
    activities: [
      "Coordination annuelle du World Cleanup Day en septembre",
      "Co-portage de la semaine nationale du Mégothon",
    ],
    provenance: {
      sourceLabel: "worldcleanupday.fr",
      sourceUrl: "https://www.worldcleanupday.fr",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "megothon",
    organizerDirectoryId: "collective-megothon",
    name: "Mégothon",
    category: "reseau_evenement",
    roles: ["organisateur_effectif", "relais"],
    ecosystemRoles: ["coordinateur_reseau", "organisateur_direct"],
    publicLeader: null,
    officialWebsite: "https://www.lemegothon.fr/qui-sommes-nous",
    publicContact: {
      label: "Plateforme Mégothon",
      url: "https://www.lemegothon.fr/qui-sommes-nous",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "À propos du Mégothon", "https://www.lemegothon.fr/qui-sommes-nous", "lemegothon.fr"),
    ]),
    parisZone: {
      label: "Mobilisation nationale & temps forts à Paris",
      arrondissements: [4, 11, 12],
      isIntramuros: true,
      scopeNote:
        "Événement national avec rassemblements parisiens documentés (notamment Bastille).",
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "kit_ou_guide",
      summary:
        "Outils et repères de collecte des mégots (contenants réutilisables) ; aucun prêt matériel direct aux tiers attribué sans preuve.",
      certainty: "partiel_ou_incertain",
    },
    activities: [
      "Semaine nationale de collecte et sensibilisation sur les mégots",
      "Cartographie des missions de ramassage citoyen",
    ],
    provenance: {
      sourceLabel: "lemegothon.fr/qui-sommes-nous",
      sourceUrl: "https://www.lemegothon.fr/qui-sommes-nous",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "spogomi-dream-in-green-france",
    name: "SPOGOMI / Dream in Green France",
    category: "reseau_evenement",
    roles: ["organisateur_effectif"],
    ecosystemRoles: ["organisateur_direct"],
    publicLeader: {
      name: "Rie Sekinoyama",
      roleTitle: "Présidente & fondatrice",
      sourceUrl: "https://www.dreamingreenfrance.com/spogomi-wc",
      verifiedAt: "2026-11-19",
    },
    officialWebsite: "https://www.dreamingreenfrance.com/spogomi-wc",
    publicContact: {
      label: "Formulaire Dream in Green France",
      url: "https://www.dreamingreenfrance.com/spogomi-wc",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Page SPOGOMI Dream in Green France", "https://www.dreamingreenfrance.com/spogomi-wc", "dreamingreenfrance.com"),
    ]),
    parisZone: {
      label: "Paris & Île-de-France (qualification parisienne avril 2025)",
      arrondissements: [],
      isIntramuros: true,
      scopeNote:
        "Association basée en Île-de-France (Cachan) ; qualification parisienne documentée en avril 2025 sans arrondissement intramuros attribué.",
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "non_attribue",
      summary:
        "Matériel fourni uniquement aux équipes inscrites pendant les compétitions ; aucun prêt externe attribué.",
      certainty: "verifie",
    },
    activities: [
      "Organisation des qualifications françaises de la SPOGOMI World Cup",
      "Ateliers franco-japonais de sensibilisation écologique",
    ],
    provenance: {
      sourceLabel: "dreamingreenfrance.com/spogomi-wc",
      sourceUrl: "https://www.dreamingreenfrance.com/spogomi-wc",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "mylegitech",
    name: "MyLegiTech",
    category: "entreprise_rse",
    roles: ["financeur", "relais"],
    ecosystemRoles: ["coordinateur_reseau"],
    publicLeader: null,
    officialWebsite: "https://www.mylegitech.com",
    publicContact: {
      label: "Site MyLegiTech",
      url: "https://www.mylegitech.com",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Site officiel MyLegiTech", "https://www.mylegitech.com", "mylegitech.com"),
    ]),
    parisZone: {
      label: "Paris 11e (soutien RSE local)",
      arrondissements: [11],
      isIntramuros: true,
      scopeNote:
        "Implication RSE documentée dans le 11e arrondissement aux côtés de la Brigade Verte.",
    },
    participationModalities: ["entreprises_rse"],
    equipmentAvailability: {
      status: "non_attribue",
      summary:
        "Entreprise LegalTech contributrice en démarche RSE ; ne prête pas de matériel aux tiers.",
      certainty: "verifie",
    },
    activities: [
      "Soutien RSE et mobilisation d'équipe sur les opérations Quartier Propre (Paris 11e)",
    ],
    provenance: {
      sourceLabel: "HelloAsso Brigade Verte & mylegitech.com",
      sourceUrl:
        "https://www.helloasso.com/associations/association-brigade-verte",
      secondarySourceUrl: "https://www.mylegitech.com",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: requireAnnuaireId("evt-paris-nettoyages"),
    annuaireEntryId: "evt-paris-nettoyages",
    name: "Ville de Paris — Direction de la Propreté et de l'Eau (DPE)",
    category: "collectivite_mairie",
    roles: ["fournisseur_materiel", "relais"],
    ecosystemRoles: ["coordinateur_reseau", "sensibilisation_prevention"],
    publicLeader: null,
    officialWebsite:
      "https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425",
    publicContact: {
      label: "Dispositif Nettoyages participatifs Paris.fr",
      url: "https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel(
        "inscription_evenement",
        "Organiser / signaler un nettoyage participatif (Paris.fr)",
        "https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425",
        "paris.fr",
      ),
    ]),
    parisZone: {
      label: "Tout Paris intramuros (1er–20e)",
      arrondissements: ALL_PARIS_ARRONDISSEMENTS,
      isIntramuros: true,
    },
    participationModalities: ["benevoles", "entreprises_rse", "scolaires"],
    equipmentAvailability: {
      status: "fournit_materiel",
      summary:
        "Prêt et fourniture de matériel de collecte et de protection sur demande via le dispositif Nettoyages participatifs.",
      items: ["Gants", "Pinces de ramassage", "Sacs poubelles", "Chasubles"],
      sourceUrl:
        "https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425",
      certainty: "verifie",
    },
    activities: [
      "Appui logistique et prêt de matériel pour nettoyages participatifs",
      "Coordination des enlèvements avec les services municipaux de propreté",
    ],
    provenance: {
      sourceLabel: "paris.fr — Nettoyages participatifs",
      sourceUrl:
        "https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "mairie-paris-5",
    name: "Mairie du 5e arrondissement de Paris",
    category: "collectivite_mairie",
    roles: ["relais", "organisateur_effectif"],
    ecosystemRoles: ["organisateur_direct", "coordinateur_reseau"],
    publicLeader: null,
    officialWebsite: "https://mairie05.paris.fr",
    publicContact: {
      label: "Portail Mairie du 5e",
      url: "https://mairie05.paris.fr",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Portail Mairie du 5e", "https://mairie05.paris.fr", "mairie05.paris.fr"),
    ]),
    parisZone: {
      label: "Paris 5e arrondissement",
      arrondissements: [5],
      isIntramuros: true,
    },
    participationModalities: ["benevoles"],
    equipmentAvailability: {
      status: "incertain",
      summary:
        "Appui via la Brigade Citoyenne du 5e ; prêt de matériel autonome hors DPE non attribué sans preuve.",
      certainty: "partiel_ou_incertain",
    },
    activities: [
      "Animation de la Brigade Citoyenne du 5e en appui à la propreté locale",
      "Opérations de ramassage et sensibilisation au tri dans le 5e",
    ],
    provenance: {
      sourceLabel: "mairie05.paris.fr",
      sourceUrl: "https://mairie05.paris.fr",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "mairie-paris-6",
    name: "Mairie du 6e arrondissement de Paris",
    category: "collectivite_mairie",
    roles: ["relais"],
    ecosystemRoles: ["coordinateur_reseau"],
    publicLeader: null,
    officialWebsite: "https://mairie06.paris.fr",
    publicContact: {
      label: "Portail Mairie du 6e",
      url: "https://mairie06.paris.fr",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Portail Mairie du 6e", "https://mairie06.paris.fr", "mairie06.paris.fr"),
    ]),
    parisZone: {
      label: "Paris 6e arrondissement",
      arrondissements: [6],
      isIntramuros: true,
    },
    participationModalities: ["benevoles"],
    equipmentAvailability: {
      status: "non_attribue",
      summary:
        "Orientation vers les dispositifs de propreté et Conseils de Quartier ; pas de prêt de matériel cleanwalk propre attribué.",
      certainty: "partiel_ou_incertain",
    },
    activities: [
      "Information locale sur la propreté, le tri et les Conseils de Quartier du 6e",
      "Relais des signalements et dispositifs municipaux de propreté",
    ],
    provenance: {
      sourceLabel: "mairie06.paris.fr",
      sourceUrl: "https://mairie06.paris.fr",
      certainty: "partiel_ou_incertain",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: requireAnnuaireId("evt-j-agis-nature"),
    annuaireEntryId: "evt-j-agis-nature",
    name: "J'agis pour la nature",
    category: "plateforme_mise_en_relation",
    roles: ["relais"],
    ecosystemRoles: ["plateforme_publication"],
    publicLeader: null,
    officialWebsite: "https://www.jagispourlanature.org",
    publicContact: {
      label: "Portail J'agis pour la nature",
      url: "https://www.jagispourlanature.org",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("plateforme_jagis", "Rechercher une mission sur J'agis pour la nature", "https://www.jagispourlanature.org", "jagispourlanature.org"),
    ]),
    platformStatus: {
      isPlatform: true,
    },
    parisZone: {
      label: "Plateforme nationale — fiches et missions à Paris",
      arrondissements: [],
      isIntramuros: true,
    },
    participationModalities: ["benevoles", "scolaires"],
    equipmentAvailability: {
      status: "non_attribue",
      summary:
        "Plateforme de publication et d'inscription : le matériel dépend de chaque structure organisatrice référencée.",
      certainty: "verifie",
    },
    activities: [
      "Référencement de missions bénévoles environnementales (Fondation pour la Nature et l'Homme)",
    ],
    provenance: {
      sourceLabel: "jagispourlanature.org",
      sourceUrl: "https://www.jagispourlanature.org",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: requireAnnuaireId("evt-je-veux-aider"),
    annuaireEntryId: "evt-je-veux-aider",
    name: "JeVeuxAider.gouv.fr",
    category: "plateforme_mise_en_relation",
    roles: ["relais"],
    ecosystemRoles: ["plateforme_publication"],
    publicLeader: null,
    officialWebsite: "https://www.jeveuxaider.gouv.fr",
    publicContact: {
      label: "Portail Réserve Civique — JeVeuxAider.gouv.fr",
      url: "https://www.jeveuxaider.gouv.fr",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("plateforme_jeveuxaider", "Missions bénévoles sur JeVeuxAider.gouv.fr", "https://www.jeveuxaider.gouv.fr", "jeveuxaider.gouv.fr"),
    ]),
    platformStatus: {
      isPlatform: true,
    },
    parisZone: {
      label: "Plateforme publique nationale — missions à Paris",
      arrondissements: [],
      isIntramuros: true,
      scopeNote:
        "Référence distinctement chaque association vérifiée (ex. « Super Brigade Verte » portée par Les Parques, distincte de Brigade Verte Paris).",
    },
    participationModalities: ["benevoles"],
    equipmentAvailability: {
      status: "non_attribue",
      summary:
        "Plateforme publique de mise en relation bénévole : ne fournit pas directement de matériel.",
      certainty: "verifie",
    },
    activities: [
      "Publication de missions de bénévolat d'associations et collectivités",
    ],
    provenance: {
      sourceLabel: "jeveuxaider.gouv.fr",
      sourceUrl: "https://www.jeveuxaider.gouv.fr",
      certainty: "verifie",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  {
    id: "cleanwalk-org",
    name: "Cleanwalk.org",
    category: "plateforme_mise_en_relation",
    roles: ["relais"],
    ecosystemRoles: ["plateforme_publication"],
    publicLeader: null,
    officialWebsite: "https://www.cleanwalk.org/",
    publicContact: {
      label: "Page associative Cleanwalk.org (HelloAsso)",
      url: "https://www.helloasso.com/associations/cleanwalk-org",
      certainty: "verifie",
    },
    publicChannels: sanitizeAndDeduplicatePublicChannels([
      channel("site_officiel", "Site officiel Cleanwalk.org", "https://www.cleanwalk.org/", "cleanwalk.org"),
      channel("plateforme_helloasso", "Page associative Cleanwalk.org (HelloAsso)", "https://www.helloasso.com/associations/cleanwalk-org", "helloasso.com"),
    ]),
    platformStatus: {
      isPlatform: true,
      v2UnavailableFeaturesNote:
        "Plateforme de mise en relation et référencement : l'inscription et plusieurs fonctionnalités de sa V2 sont actuellement indisponibles ou en transition technique. Les bénévoles et opérations des structures utilisatrices ne sont pas attribués à Cleanwalk.org.",
    },
    parisZone: {
      label: "Plateforme collaborative de référencement (portée francophone)",
      arrondissements: [],
      isIntramuros: true,
    },
    participationModalities: ["benevoles"],
    equipmentAvailability: {
      status: "non_attribue",
      summary:
        "Plateforme de référencement : ne prête pas de matériel et ne porte pas les opérations des structures utilisatrices.",
      certainty: "verifie",
    },
    activities: [
      "Référencement collaboratif de cleanwalks citoyennes (V2 en transition technique)",
    ],
    provenance: {
      sourceLabel: "HelloAsso Cleanwalk.org & dépôt V2",
      sourceUrl: "https://www.helloasso.com/associations/cleanwalk-org",
      certainty: "partiel_ou_incertain",
    },
    verifiedAt: "2026-11-19",
    isCleanMyMapMember: false,
  },
  ...PARIS_PREVENTION_ACTORS_RAW,
] as const;
