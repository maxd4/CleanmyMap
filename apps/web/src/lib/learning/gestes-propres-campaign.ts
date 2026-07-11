export type GestesPropresCampaignLocalizedText = {
  fr: string;
  en: string;
};

export type GestesPropresCampaignSituation = {
  id: string;
  object: GestesPropresCampaignLocalizedText;
  badReflex: GestesPropresCampaignLocalizedText;
  goodGesture: GestesPropresCampaignLocalizedText;
  solution: GestesPropresCampaignLocalizedText;
  solutionLabel: GestesPropresCampaignLocalizedText;
  solutionHref: string;
};

export type GestesPropresCampaign = {
  badge: GestesPropresCampaignLocalizedText;
  title: GestesPropresCampaignLocalizedText;
  period: GestesPropresCampaignLocalizedText;
  summary: GestesPropresCampaignLocalizedText;
  sourceName: GestesPropresCampaignLocalizedText;
  sourceUrl: string;
  publishedAt: string;
  ctaLabel: GestesPropresCampaignLocalizedText;
  situations: GestesPropresCampaignSituation[];
};

const GESTES_PROPRES_SOURCE: GestesPropresCampaignLocalizedText = {
  fr: "Gestes Propres",
  en: "Gestes Propres",
};

export const GESTES_PROPRES_CAMPAIGN: GestesPropresCampaign = {
  badge: {
    fr: "Campagne à la une",
    en: "Featured campaign",
  },
  title: {
    fr: "Ça va pas s’faire tout seul !",
    en: "It won't do itself!",
  },
  period: {
    fr: "Campagne Gestes Propres · 2025–2026",
    en: "Gestes Propres campaign · 2025–2026",
  },
  summary: {
    fr: "La campagne rappelle qu’un déchet abandonné ne disparaît jamais seul : mégot, canette, bouteille et encombrant ont chacun une bonne issue.",
    en: "The campaign reminds us that litter never disappears on its own: butts, cans, bottles and bulky items each need the right ending.",
  },
  sourceName: GESTES_PROPRES_SOURCE,
  sourceUrl: "https://www.gestespropres.com/article/50-ca-va-pas-sfaire-tout-seul",
  publishedAt: "2025-2026",
  ctaLabel: {
    fr: "Ouvrir la campagne",
    en: "Open campaign",
  },
  situations: [
    {
      id: "megot",
      object: {
        fr: "Mégot",
        en: "Butt",
      },
      badReflex: {
        fr: "Le laisser tomber par réflexe.",
        en: "Let it drop by reflex.",
      },
      goodGesture: {
        fr: "Le garder jusqu’au cendrier ou à la poubelle.",
        en: "Keep it until a bin or ashtray.",
      },
      solution: {
        fr: "Cendrier de poche ou poubelle de rue.",
        en: "Pocket ashtray or street bin.",
      },
      solutionLabel: {
        fr: "Voir le signalement",
        en: "Open reporting",
      },
      solutionHref: "/sections/trash-spotter",
    },
    {
      id: "canette",
      object: {
        fr: "Canette",
        en: "Can",
      },
      badReflex: {
        fr: "La poser à terre en pensant qu’elle partira toute seule.",
        en: "Set it down and hope it will disappear on its own.",
      },
      goodGesture: {
        fr: "La mettre dans le bon bac emballages.",
        en: "Put it in the right packaging bin.",
      },
      solution: {
        fr: "Bac emballages ou point de tri local.",
        en: "Packaging bin or local sorting point.",
      },
      solutionLabel: {
        fr: "Voir le tri",
        en: "Open sorting",
      },
      solutionHref: "/sections/recycling",
    },
    {
      id: "bouteille",
      object: {
        fr: "Bouteille",
        en: "Bottle",
      },
      badReflex: {
        fr: "La laisser sur place après usage.",
        en: "Leave it behind after use.",
      },
      goodGesture: {
        fr: "La déposer dans la filière de collecte adaptée.",
        en: "Put it into the appropriate collection stream.",
      },
      solution: {
        fr: "Tri des emballages ou point de collecte dédié.",
        en: "Packaging sorting or dedicated drop-off point.",
      },
      solutionLabel: {
        fr: "Trouver la filière",
        en: "Find the stream",
      },
      solutionHref: "/actions/map",
    },
    {
      id: "armoire",
      object: {
        fr: "Armoire / encombrant",
        en: "Wardrobe / bulky item",
      },
      badReflex: {
        fr: "L’abandonner dans l’espace public en espérant qu’on la récupère.",
        en: "Leave it in public space and hope someone will take it.",
      },
      goodGesture: {
        fr: "La diriger vers la déchèterie ou une reprise adaptée.",
        en: "Send it to a drop-off center or suitable take-back stream.",
      },
      solution: {
        fr: "Déchèterie, reprise en magasin ou solution locale.",
        en: "Drop-off center, take-back or local solution.",
      },
      solutionLabel: {
        fr: "Chercher une solution",
        en: "Find a solution",
      },
      solutionHref: "/actions/map",
    },
  ],
};
