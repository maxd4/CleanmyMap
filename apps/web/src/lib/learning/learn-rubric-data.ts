export type LearnLocale = "fr" | "en";

export type LearnLocalizedText = {
  fr: string;
  en: string;
};

export type LearnCardVisualTone = "amber" | "cyan" | "emerald" | "violet";
export type LearnCardVisualMotif = "layers" | "path" | "quiz" | "calendar" | "guides" | "resources";

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

export type LearnEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

export const LEARN_OVERVIEW_CARDS: Record<LearnLocale, LearnLinkCard[]> = {
  fr: [
    {
      href: "/learn/comprendre",
      title: "Vulgarisation",
      detail: "Lire le contexte, les ordres de grandeur et le lien vers la méthodologie.",
      visual: {
        tone: "violet",
        motif: "layers",
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
      href: "/learn/sentrainer",
      title: "S'entraîner",
      detail: "Ancrer les repères avec des quiz courts et du rappel actif.",
      visual: {
        tone: "cyan",
        motif: "quiz",
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
      href: "/learn/bonnes-pratiques",
      title: "Bonnes pratiques",
      detail: "Repères courts pour agir sans détour.",
      visual: {
        tone: "emerald",
        motif: "guides",
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
  ],
  en: [
    {
      href: "/learn/comprendre",
      title: "Explanation",
      detail: "Read the context, the orders of magnitude and the link to methodology.",
      visual: {
        tone: "violet",
        motif: "layers",
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
      href: "/learn/sentrainer",
      title: "Practice",
      detail: "Anchor the cues with short quizzes and active recall.",
      visual: {
        tone: "cyan",
        motif: "quiz",
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
      href: "/learn/bonnes-pratiques",
      title: "Good practices",
      detail: "Short cues for acting without detours.",
      visual: {
        tone: "emerald",
        motif: "guides",
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
  ],
};

export const LEARN_PRACTICE_LINKS: Record<LearnLocale, LearnLinkCard[]> = {
  fr: [
    {
      href: "/sections/recycling",
      title: "Bien trier",
      detail: "Repères de tri, erreurs fréquentes et seconde vie.",
      visual: {
        tone: "emerald",
        motif: "guides",
        badge: { fr: "Tri", en: "Sorting" },
        chips: [
          { fr: "Q&A", en: "Q&A" },
          { fr: "Seconde vie", en: "Second life" },
        ],
      },
    },
    {
      href: "/sections/compost",
      title: "Composter",
      detail: "Composter chez soi, en quartier ou en association.",
      visual: {
        tone: "violet",
        motif: "layers",
        badge: { fr: "Compost", en: "Compost" },
        chips: [
          { fr: "Maison", en: "Home" },
          { fr: "Quartier", en: "Neighborhood" },
        ],
      },
    },
    {
      href: "/actions/new",
      title: "Réduire à la source",
      detail: "Passer du geste ponctuel à l'action suivie.",
      visual: {
        tone: "emerald",
        motif: "quiz",
        badge: { fr: "Action", en: "Action" },
        chips: [
          { fr: "Suivi", en: "Tracking" },
          { fr: "Mesure", en: "Measurement" },
        ],
      },
    },
    {
      href: "/actions/map",
      title: "Carte d'entraînement",
      detail: "Lire la carte avec les bons repères.",
      visual: {
        tone: "amber",
        motif: "path",
        badge: { fr: "Carte", en: "Map" },
        chips: [
          { fr: "Zone", en: "Area" },
          { fr: "Repères", en: "Cues" },
        ],
      },
    },
    {
      href: "/sections/trash-spotter",
      title: "Signaler un déchet",
      detail: "Remonter un point avec le bon contexte.",
      visual: {
        tone: "violet",
        motif: "resources",
        badge: { fr: "Hotspot", en: "Hotspot" },
        chips: [
          { fr: "Contexte", en: "Context" },
          { fr: "Signalement", en: "Report" },
        ],
      },
    },
  ],
  en: [
    {
      href: "/sections/recycling",
      title: "Sort well",
      detail: "Sorting cues, common mistakes and second life.",
      visual: {
        tone: "emerald",
        motif: "guides",
        badge: { fr: "Tri", en: "Sorting" },
        chips: [
          { fr: "Q&A", en: "Q&A" },
          { fr: "Seconde vie", en: "Second life" },
        ],
      },
    },
    {
      href: "/sections/compost",
      title: "Compost",
      detail: "Compost at home, in a neighborhood site or with an association.",
      visual: {
        tone: "violet",
        motif: "layers",
        badge: { fr: "Compost", en: "Compost" },
        chips: [
          { fr: "Maison", en: "Home" },
          { fr: "Quartier", en: "Neighborhood" },
        ],
      },
    },
    {
      href: "/actions/new",
      title: "Reduce waste",
      detail: "Move from a one-off gesture to a tracked action.",
      visual: {
        tone: "emerald",
        motif: "quiz",
        badge: { fr: "Action", en: "Action" },
        chips: [
          { fr: "Suivi", en: "Tracking" },
          { fr: "Mesure", en: "Measurement" },
        ],
      },
    },
    {
      href: "/actions/map",
      title: "Training map",
      detail: "Read the map with the right cues.",
      visual: {
        tone: "amber",
        motif: "path",
        badge: { fr: "Carte", en: "Map" },
        chips: [
          { fr: "Zone", en: "Area" },
          { fr: "Repères", en: "Cues" },
        ],
      },
    },
    {
      href: "/sections/trash-spotter",
      title: "Trash Spotter",
      detail: "Report a point with the right context.",
      visual: {
        tone: "violet",
        motif: "resources",
        badge: { fr: "Hotspot", en: "Hotspot" },
        chips: [
          { fr: "Contexte", en: "Context" },
          { fr: "Signalement", en: "Report" },
        ],
      },
    },
  ],
};

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
