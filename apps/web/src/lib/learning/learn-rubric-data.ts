export type LearnLocale = "fr" | "en";

export type LearnLocalizedText = {
  fr: string;
  en: string;
};

type LearnCardVisualTone = "amber" | "cyan" | "emerald" | "violet";
type LearnCardVisualMotif = "layers" | "path" | "quiz" | "calendar" | "guides" | "resources";

export type LearnCardVisual = {
  tone: LearnCardVisualTone;
  motif: LearnCardVisualMotif;
  badge: LearnLocalizedText;
  chips: LearnLocalizedText[];
  stats?: { value: string; label: LearnLocalizedText }[];
};

export type LearnLinkCard = {
  href: string;
  title: string;
  detail: string;
  visual: LearnCardVisual;
};

type LearnCardDefinition = {
  id: string;
  href: string;
  tone: LearnCardVisual["tone"];
  motif: LearnCardVisual["motif"];
  copy: {
    title: LearnLocalizedText;
    detail: LearnLocalizedText;
    badge: LearnLocalizedText;
    chips: LearnLocalizedText[];
    stats?: { value: string; label: LearnLocalizedText }[];
  };
};

function projectLearnCards(definitions: LearnCardDefinition[]): Record<LearnLocale, LearnLinkCard[]> {
  const project = (locale: LearnLocale) => definitions.map((definition) => ({
    href: definition.href,
    title: definition.copy.title[locale],
    detail: definition.copy.detail[locale],
    visual: {
      tone: definition.tone,
      motif: definition.motif,
      badge: definition.copy.badge,
      chips: definition.copy.chips,
      stats: definition.copy.stats,
    },
  }));

  return { fr: project("fr"), en: project("en") };
}

export type LearnEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

const LEARN_OVERVIEW_CARD_DEFINITIONS: LearnCardDefinition[] = [
  {
    id: "learn-comprendre",
    href: "/learn/comprendre",
    tone: "violet",
    motif: "layers",
    copy: {
      title: { fr: "Vulgarisation", en: "Explanation" },
      detail: {
        fr: "Lire le contexte, les ordres de grandeur et le lien vers la méthodologie.",
        en: "Read the context, the orders of magnitude and the link to methodology.",
      },
      badge: { fr: "Contexte", en: "Context" },
      chips: [
        { fr: "Ordres de grandeur", en: "Orders of magnitude" },
        { fr: "Méthodologie", en: "Methodology" },
      ],
      stats: [
        { value: "3", label: { fr: "couches", en: "layers" } },
        { value: "1", label: { fr: "porte d'entrée", en: "entry point" } },
      ],
    },
  },
  {
    id: "learn-sentrainer",
    href: "/learn/sentrainer",
    tone: "cyan",
    motif: "quiz",
    copy: {
      title: { fr: "S'entraîner", en: "Practice" },
      detail: {
        fr: "Ancrer les repères avec des quiz courts et du rappel actif.",
        en: "Anchor the cues with short quizzes and active recall.",
      },
      badge: { fr: "Quiz court", en: "Short quiz" },
      chips: [
        { fr: "Rappel actif", en: "Active recall" },
        { fr: "Sessions brèves", en: "Short sessions" },
      ],
      stats: [
        { value: "5", label: { fr: "minutes", en: "minutes" } },
        { value: "4", label: { fr: "états", en: "states" } },
      ],
    },
  },
  {
    id: "learn-bonnes-pratiques",
    href: "/learn/bonnes-pratiques",
    tone: "emerald",
    motif: "guides",
    copy: {
      title: { fr: "Bonnes pratiques", en: "Good practices" },
      detail: {
        fr: "Repères courts pour agir sans détour.",
        en: "Short cues for acting without detours.",
      },
      badge: { fr: "Gestes utiles", en: "Useful gestures" },
      chips: [
        { fr: "Avant / pendant / après", en: "Before / during / after" },
        { fr: "Lecture rapide", en: "Quick scan" },
      ],
      stats: [
        { value: "1", label: { fr: "checklist", en: "checklist" } },
        { value: "3", label: { fr: "temps", en: "steps" } },
      ],
    },
  },
];

const LEARN_PRACTICE_CARD_DEFINITIONS: LearnCardDefinition[] = [
  {
    id: "practice-recycling",
    href: "/sections/recycling",
    tone: "emerald",
    motif: "guides",
    copy: {
      title: { fr: "Bien trier", en: "Sort well" },
      detail: {
        fr: "Repères de tri, erreurs fréquentes et seconde vie.",
        en: "Sorting cues, common mistakes and second life.",
      },
      badge: { fr: "Tri", en: "Sorting" },
      chips: [
        { fr: "Q&A", en: "Q&A" },
        { fr: "Seconde vie", en: "Second life" },
      ],
    },
  },
  {
    id: "practice-compost",
    href: "/sections/compost",
    tone: "violet",
    motif: "layers",
    copy: {
      title: { fr: "Composter", en: "Compost" },
      detail: {
        fr: "Composter chez soi, en quartier ou en association.",
        en: "Compost at home, in a neighborhood site or with an association.",
      },
      badge: { fr: "Compost", en: "Compost" },
      chips: [
        { fr: "Maison", en: "Home" },
        { fr: "Quartier", en: "Neighborhood" },
      ],
    },
  },
  {
    id: "practice-source-reduction",
    href: "/actions/new",
    tone: "emerald",
    motif: "quiz",
    copy: {
      title: { fr: "Réduire à la source", en: "Reduce waste" },
      detail: {
        fr: "Passer du geste ponctuel à l'action suivie.",
        en: "Move from a one-off gesture to a tracked action.",
      },
      badge: { fr: "Action", en: "Action" },
      chips: [
        { fr: "Suivi", en: "Tracking" },
        { fr: "Mesure", en: "Measurement" },
      ],
    },
  },
  {
    id: "practice-map",
    href: "/actions/map",
    tone: "amber",
    motif: "path",
    copy: {
      title: { fr: "Carte d'entraînement", en: "Training map" },
      detail: {
        fr: "Lire la carte avec les bons repères.",
        en: "Read the map with the right cues.",
      },
      badge: { fr: "Carte", en: "Map" },
      chips: [
        { fr: "Zone", en: "Area" },
        { fr: "Repères", en: "Cues" },
      ],
    },
  },
  {
    id: "practice-report",
    href: "/signalement",
    tone: "violet",
    motif: "resources",
    copy: {
      title: { fr: "Signaler un déchet", en: "Trash Spotter" },
      detail: {
        fr: "Remonter un point avec le bon contexte.",
        en: "Report a point with the right context.",
      },
      badge: { fr: "Hotspot", en: "Hotspot" },
      chips: [
        { fr: "Contexte", en: "Context" },
        { fr: "Signalement", en: "Report" },
      ],
    },
  },
];

export const LEARN_OVERVIEW_CARDS = projectLearnCards(LEARN_OVERVIEW_CARD_DEFINITIONS);
export const LEARN_PRACTICE_LINKS = projectLearnCards(LEARN_PRACTICE_CARD_DEFINITIONS);

export const LEARN_RESOURCE_EVENTS: LearnEvent[] = [
  {
    title: "Grande Collecte de Printemps - Paris 14",
    start: new Date(2026, 4, 16, 10, 0),
    end: new Date(2026, 4, 16, 14, 0),
    allDay: false,
  },
  {
    title: "Atelier Recyclage Créatif",
    start: new Date(2026, 4, 21, 18, 0),
    end: new Date(2026, 4, 21, 20, 0),
    allDay: false,
  },
];
