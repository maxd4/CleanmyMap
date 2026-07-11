export type GestesPropresInsightTheme = "tri" | "reduction" | "collectif";

export type GestesPropresPermissionStatus = "not_requested" | "pending" | "approved";

export type GestesPropresLocalizedText = {
  fr: string;
  en: string;
};

export type GestesPropresInsight = {
  id: string;
  title: GestesPropresLocalizedText;
  theme: GestesPropresInsightTheme;
  summary: GestesPropresLocalizedText;
  keyPoints: GestesPropresLocalizedText[];
  action: GestesPropresLocalizedText;
  sourceName: GestesPropresLocalizedText;
  sourceUrl: string;
  publishedAt: string;
  image?: string;
  imageCredit?: string;
  permissionStatus: GestesPropresPermissionStatus;
};

const GESTES_PROPRES_SOURCE: GestesPropresLocalizedText = {
  fr: "Gestes Propres",
  en: "Gestes Propres",
};

export const GESTES_PROPRES_INSIGHTS: GestesPropresInsight[] = [
  {
    id: "automobilistes-plus-jeter",
    title: {
      fr: "Pourquoi les automobilistes sont-ils susceptibles de plus jeter ?",
      en: "Why are motorists more likely to litter?",
    },
    theme: "reduction",
    summary: {
      fr: "Gestes Propres montre que l’anonymat de la route, la surcharge mentale et les automatismes modifient le rapport au déchet.",
      en: "Gestes Propres shows that road anonymity, cognitive overload and habits change how people handle waste.",
    },
    keyPoints: [
      {
        fr: "Le contexte de conduite réduit l’attention portée au geste.",
        en: "Driving context reduces attention to the gesture.",
      },
      {
        fr: "Un dépôt par la fenêtre peut devenir un réflexe socialement banalisé.",
        en: "Throwing waste from a car can become socially normalized.",
      },
      {
        fr: "La prévention passe par des repères visibles et des rappels au bon moment.",
        en: "Prevention relies on visible cues and reminders at the right time.",
      },
    ],
    action: {
      fr: "Renforcer les points d’arrêt visibles sur les axes de passage.",
      en: "Strengthen visible stop points along traffic routes.",
    },
    sourceName: GESTES_PROPRES_SOURCE,
    sourceUrl: "https://www.gestespropres.com/article/73-pourquoi-les-automobilistes-sont-ils-susceptibles-de-plus-jeter",
    publishedAt: "2026-05-22",
    permissionStatus: "not_requested",
  },
  {
    id: "poubelles-trop-discretes",
    title: {
      fr: "Poubelles trop discrètes : un frein à la propreté de nos rues ?",
      en: "Are too discreet bins a barrier to cleaner streets?",
    },
    theme: "reduction",
    summary: {
      fr: "L’article défend l’idée qu’une corbeille trop discrète perd son pouvoir d’appel et favorise le jet au sol.",
      en: "The article argues that a bin that is too discreet loses its pull and encourages littering.",
    },
    keyPoints: [
      {
        fr: "La visibilité de la poubelle compte autant que sa présence.",
        en: "A bin's visibility matters as much as its presence.",
      },
      {
        fr: "Un contraste fort aide l’usager à repérer la bonne solution tout de suite.",
        en: "Strong contrast helps people spot the right option immediately.",
      },
      {
        fr: "Le design et le placement peuvent réduire les dépôts sauvages.",
        en: "Design and placement can reduce littering.",
      },
    ],
    action: {
      fr: "Placer des corbeilles visibles et contrastées aux points de passage.",
      en: "Place visible, high-contrast bins at passing points.",
    },
    sourceName: GESTES_PROPRES_SOURCE,
    sourceUrl: "https://www.gestespropres.com/article/65-poubelles-trop-discretes-un-frein-a-la-proprete-de-nos-rues",
    publishedAt: "2026-04-22",
    permissionStatus: "not_requested",
  },
  {
    id: "suppression-poubelles",
    title: {
      fr: "La suppression des poubelles",
      en: "Removing bins",
    },
    theme: "reduction",
    summary: {
      fr: "Gestes Propres explique qu’en milieu naturel, moins de corbeilles peut parfois produire moins de déchets abandonnés si la transition est accompagnée.",
      en: "Gestes Propres explains that in natural areas, fewer bins can sometimes mean less litter if the transition is accompanied.",
    },
    keyPoints: [
      {
        fr: "Trop de corbeilles peut déplacer le problème au lieu de le résoudre.",
        en: "Too many bins can shift the problem instead of solving it.",
      },
      {
        fr: "La suppression doit rester ciblée et observée sur le terrain.",
        en: "Removal must stay targeted and observed in the field.",
      },
      {
        fr: "La signalétique et la pédagogie évitent l’effet de rupture.",
        en: "Signage and education prevent a sudden break in habits.",
      },
    ],
    action: {
      fr: "Supprimer seulement les corbeilles qui créent plus de dépôts qu’elles n’aident.",
      en: "Remove only the bins that create more dumping than they help.",
    },
    sourceName: GESTES_PROPRES_SOURCE,
    sourceUrl: "https://www.gestespropres.com/article/63-la-suppression-des-poubelles",
    publishedAt: "2026-03-23",
    permissionStatus: "not_requested",
  },
  {
    id: "commercants-levier-activer",
    title: {
      fr: "Commerçants : un levier à activer",
      en: "Merchants: a lever to activate",
    },
    theme: "reduction",
    summary: {
      fr: "La campagne montre que le point de vente peut devenir un moment décisif pour rappeler qu’un petit déchet compte encore.",
      en: "The campaign shows that the point of sale can become a decisive moment to remind people that even small waste still matters.",
    },
    keyPoints: [
      {
        fr: "Le geste d’abandon est fortement lié au contexte d’achat ou d’attente.",
        en: "The littering gesture is strongly tied to the shopping or waiting context.",
      },
      {
        fr: "Un message court, visible au bon moment, vaut mieux qu’une consigne tardive.",
        en: "A short message, visible at the right moment, beats a late instruction.",
      },
      {
        fr: "Les commerces de proximité peuvent relayer la sensibilisation locale.",
        en: "Local shops can relay local awareness efforts.",
      },
    ],
    action: {
      fr: "Installer un rappel simple là où le geste se produit.",
      en: "Install a simple reminder where the gesture happens.",
    },
    sourceName: GESTES_PROPRES_SOURCE,
    sourceUrl: "https://www.gestespropres.com/article/69-commercants-un-levier-a-activer",
    publishedAt: "2026-04-28",
    permissionStatus: "not_requested",
  },
  {
    id: "que-faire-de-mes-objets",
    title: {
      fr: "Découvrez « Que Faire de Mes Objets », l’outil de l'ADEME pour mieux trier, donner et recycler !",
      en: "Discover 'What to Do with My Items', ADEME's tool to sort, give and recycle better!",
    },
    theme: "tri",
    summary: {
      fr: "Gestes Propres présente l’assistant de l’ADEME comme un moyen rapide de décider entre réparer, donner ou recycler un objet.",
      en: "Gestes Propres presents ADEME's assistant as a quick way to choose between repairing, giving away or recycling an item.",
    },
    keyPoints: [
      {
        fr: "L’outil répond en quelques clics à une question simple mais fréquente.",
        en: "The tool answers a simple but frequent question in a few clicks.",
      },
      {
        fr: "Il aide à orienter les objets vers la bonne suite de vie.",
        en: "It helps direct items toward the right next life.",
      },
      {
        fr: "Le service est gratuit et pensé pour être réutilisable par les collectivités.",
        en: "The service is free and designed for reuse by local authorities.",
      },
    ],
    action: {
      fr: "Ouvrir l’assistant avant de jeter, donner ou réparer un objet.",
      en: "Open the assistant before throwing away, giving away or repairing an item.",
    },
    sourceName: GESTES_PROPRES_SOURCE,
    sourceUrl: "https://www.gestespropres.com/article/41-decouvrez-que-faire-de-mes-objets-loutil-de-lademe-pour-mieux-trier-donner-et-recycler",
    publishedAt: "2025-02-04",
    permissionStatus: "not_requested",
  },
  {
    id: "pollution-lingettes",
    title: {
      fr: "L’AMF et Gestes Propres s’associent dans une campagne de sensibilisation contre la pollution des lingettes.",
      en: "AMF and Gestes Propres join forces in an awareness campaign against wipe pollution.",
    },
    theme: "tri",
    summary: {
      fr: "La campagne rappelle qu’une lingette usagée n’est pas anodine et doit finir à la poubelle, jamais dans les toilettes.",
      en: "The campaign reminds people that a used wipe is not harmless and must go in the bin, never in the toilet.",
    },
    keyPoints: [
      {
        fr: "Les lingettes peuvent créer une pollution importante si elles sont mal jetées.",
        en: "Wipes can create significant pollution when disposed of incorrectly.",
      },
      {
        fr: "Le message vise les collectivités et les relais de terrain.",
        en: "The message targets local authorities and field relays.",
      },
      {
        fr: "La consigne unique doit rester claire et sans ambiguïté.",
        en: "The single instruction must stay clear and unambiguous.",
      },
    ],
    action: {
      fr: "Jeter la lingette usagée à la poubelle, jamais dans les toilettes.",
      en: "Put the used wipe in the bin, never in the toilet.",
    },
    sourceName: GESTES_PROPRES_SOURCE,
    sourceUrl: "https://www.gestespropres.com/article/43-lamf-et-gestes-propres-sassocient-dans-une-campagne-de-sensibilisation-contre-la-pollution-des-lingettes",
    publishedAt: "2025-02-03",
    permissionStatus: "not_requested",
  },
];
