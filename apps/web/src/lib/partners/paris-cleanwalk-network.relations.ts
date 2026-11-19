import type { ParisCleanwalkRelation } from "./paris-cleanwalk-network";

export const PARIS_CLEANWALK_RELATIONS: readonly ParisCleanwalkRelation[] = [
  {
    id: "rel-wcd-megothon",
    sourceId: "world-cleanup-day-france",
    targetId: "megothon",
    relationType: "action_commune",
    title: "Co-mobilisation nationale Mégothon",
    summary:
      "Coordination conjointe de la semaine nationale de collecte des mégots (Mégothon) avec les relais World Cleanup Day France.",
    operations: [
      {
        id: "megothon-edition-2026",
        date: "2026-05-23",
        label: "Semaine nationale du Mégothon 2026",
        sourceUrl: "https://www.worldcleanupday.fr",
      },
    ],
    frequencyKnown: true,
    source: {
      label: "worldcleanupday.fr & lemegothon.fr/qui-sommes-nous",
      url: "https://www.worldcleanupday.fr",
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
    id: "rel-spogomi-jagis",
    sourceId: "spogomi-dream-in-green-france",
    targetId: "evt-j-agis-nature",
    relationType: "publie_sur",
    title: "Publie ses missions sur J'agis pour la nature",
    summary:
      "Dream in Green France référence des opérations de ramassage et ateliers sur J'agis pour la nature.",
    frequencyKnown: false,
    source: {
      label: "jagispourlanature.org",
      url: "https://www.jagispourlanature.org",
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
      url: "https://www.jeveuxaider.gouv.fr",
      verifiedAt: "2026-11-19",
      certainty: "verifie",
    },
  },
  {
    id: "rel-dpe-brigade-verte",
    sourceId: "evt-paris-nettoyages",
    targetId: "asso-featured-1",
    relationType: "appui_logistique",
    title: "Cadre municipal nettoyages participatifs",
    summary:
      "Articulation des opérations associatives parisiennes avec le dispositif municipal de la Direction de la Propreté et de l'Eau.",
    frequencyKnown: false,
    source: {
      label: "paris.fr — Nettoyages participatifs",
      url: "https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425",
      verifiedAt: "2026-11-19",
      certainty: "partiel_ou_incertain",
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
      label: "mairie05.paris.fr",
      url: "https://mairie05.paris.fr",
      verifiedAt: "2026-11-19",
      certainty: "verifie",
    },
  },
  {
    id: "rel-surfrider-wcd",
    sourceId: "asso-surfrider-paris",
    targetId: "world-cleanup-day-france",
    relationType: "presence_evenement",
    title: "Convergence campagnes de collecte urbaines",
    summary:
      "Participation et relais de campagnes de sensibilisation sans fusion de gouvernance ni appartenance réciproque.",
    frequencyKnown: false,
    source: {
      label: "surfrider-paris.fr/nos-actions",
      url: "https://surfrider-paris.fr/nos-actions",
      verifiedAt: "2026-11-19",
      certainty: "partiel_ou_incertain",
    },
  },
] as const;
