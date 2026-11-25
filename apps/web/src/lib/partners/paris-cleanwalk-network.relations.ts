import type { ParisCleanwalkRelation } from "./paris-cleanwalk-network";
import { PARIS_MEGOTS_RELATIONS } from "./paris-cleanwalk-network.megots.relations";
import { PARIS_SCHEDULED_OPERATIONS, projectScheduledRelations } from "./paris-cleanwalk-network.scheduled";

export const PARIS_CLEANWALK_RELATIONS: readonly ParisCleanwalkRelation[] = [
  {
    id: "rel-wcd-megothon",
    sourceId: "world-cleanup-day-france",
    targetId: "megothon",
    relationType: "partenariat",
    title: "Partenariat historique (non coporteuse en 2026)",
    summary:
      "World Cleanup Day France précise ne plus être coporteuse du Mégothon en 2026 tout en restant partenaire de l'initiative.",
    frequencyKnown: false,
    source: {
      label: "Rapport d'activité 2025 World Cleanup Day France",
      url: "https://www.worldcleanupday.fr/wp-content/uploads/2026/04/Rapport-activite-2025-1.pdf",
      verifiedAt: "2026-11-19",
      certainty: "verifie",
    },
  },
  {
    id: "rel-brigade-verte-mylegitech",
    sourceId: "asso-featured-1",
    targetId: "mylegitech",
    relationType: "soutien_rse",
    title: "Soutien RSE & extension Paris 11e",
    summary:
      "Implication RSE de MyLegiTech et de ses équipes dans le déploiement d'opérations Quartier Propre dans le 11e arrondissement.",
    frequencyKnown: false,
    source: {
      label: "HelloAsso Association Brigade Verte",
      url: "https://www.helloasso.com/associations/association-brigade-verte",
      verifiedAt: "2026-11-19",
      certainty: "verifie",
    },
  },
  {
    id: "rel-the-clean-project-megothon",
    sourceId: "the-clean-project",
    targetId: "megothon",
    relationType: "action_commune",
    title: "Partenariat événementiel & clôture Bastille",
    summary:
      "Animation de villages et défis éco-citoyens par The Clean Project en lien avec la semaine nationale du Mégothon à Paris.",
    frequencyKnown: false,
    source: {
      label: "lemegothon.fr & thecleanproject.fr",
      url: "https://www.lemegothon.fr/qui-sommes-nous",
      verifiedAt: "2026-11-19",
      certainty: "verifie",
    },
  },
  {
    id: "rel-brigade-verte-jagis",
    sourceId: "asso-featured-1",
    targetId: "evt-j-agis-nature",
    relationType: "publie_sur",
    title: "Publie ses actions sur J'agis pour la nature",
    summary:
      "Brigade Verte Paris dispose d'une fiche structure vérifiée pour publier ses missions bénévoles sans lien de coorganisation.",
    frequencyKnown: false,
    source: {
      label: "jagispourlanature.org/structure/brigade-verte-paris",
      url: "https://www.jagispourlanature.org/structure/brigade-verte-paris",
      verifiedAt: "2026-11-19",
      certainty: "verifie",
    },
  },
  {
    id: "rel-zerowaste-jeveuxaider",
    sourceId: "asso-zerowaste-paris",
    targetId: "evt-je-veux-aider",
    relationType: "publie_sur",
    title: "Publie ses missions sur JeVeuxAider.gouv.fr",
    summary:
      "Zero Waste Paris diffuse des missions bénévoles via la plateforme publique JeVeuxAider.gouv.fr.",
    frequencyKnown: false,
    source: {
      label: "jeveuxaider.gouv.fr",
      url: "https://www.jeveuxaider.gouv.fr/organisations/16300-zero-waste-paris",
      verifiedAt: "2026-11-19",
      certainty: "verifie",
    },
  },
  {
    id: "rel-dpe-mairie-5",
    sourceId: "evt-paris-nettoyages",
    targetId: "mairie-paris-5",
    relationType: "appui_logistique",
    title: "Appui propreté & Brigade Citoyenne du 5e",
    summary:
      "Intervention de la Brigade Citoyenne du 5e en appui aux services municipaux de propreté.",
    frequencyKnown: false,
    source: {
      label: "Mairie du 5e — Brigade Citoyenne",
      url: "https://mairie05.paris.fr/pages/contre-les-rats-la-mairie-du-5e-passe-a-l-offensive-32006",
      verifiedAt: "2026-11-19",
      certainty: "verifie",
    },
  },
  ...PARIS_MEGOTS_RELATIONS,
  ...projectScheduledRelations(PARIS_SCHEDULED_OPERATIONS),
] as const;
