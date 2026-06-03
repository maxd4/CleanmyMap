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
      title: "Comprendre",
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
      detail: "Guides courts, gestes utiles et séquence avant / pendant / après.",
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
    {
      href: "/learn/ressources",
      title: "Ressources",
      detail: "Kit terrain, repères de tri et événements utiles.",
      visual: {
        tone: "amber",
        motif: "resources",
        badge: { fr: "Kit terrain", en: "Field kit" },
        chips: [
          { fr: "Kit", en: "Kit" },
          { fr: "Tri", en: "Sorting" },
        ],
        stats: [
          { value: "12", label: { fr: "repères", en: "references" } },
          { value: "2", label: { fr: "événements", en: "events" } },
        ],
      },
    },
  ],
  en: [
    {
      href: "/learn/comprendre",
      title: "Understand",
      detail: "Read the context, the order of magnitude and the link to methodology.",
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
      title: "Best practices",
      detail: "Short guides, useful gestures and a before / during / after sequence.",
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
    {
      href: "/learn/ressources",
      title: "Resources",
      detail: "Field kit, sorting cues and useful events.",
      visual: {
        tone: "amber",
        motif: "resources",
        badge: { fr: "Kit terrain", en: "Field kit" },
        chips: [
          { fr: "Kit", en: "Kit" },
          { fr: "Tri", en: "Sorting" },
        ],
        stats: [
          { value: "12", label: { fr: "repères", en: "references" } },
          { value: "2", label: { fr: "événements", en: "events" } },
        ],
      },
    },
  ],
};

export const LEARN_PRACTICE_LINKS: Record<LearnLocale, LearnLinkCard[]> = {
  fr: [
    {
      href: "/sections/recycling",
      title: "Que faire des déchets ?",
      detail: "Repères de tri, Q&A rapide et seconde vie.",
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
      title: "Guide compost",
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
      href: "/sections/weather",
      title: "Météo d'action",
      detail: "Choisir le bon moment, le bon kit et le bon niveau de risque.",
      visual: {
        tone: "cyan",
        motif: "path",
        badge: { fr: "Fenêtre", en: "Window" },
        chips: [
          { fr: "Kit", en: "Kit" },
          { fr: "Risque", en: "Risk" },
        ],
      },
    },
    {
      href: "/actions/map",
      title: "Carte d'entraînement",
      detail: "Vérifier la zone avant de partir.",
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
      href: "/actions/new",
      title: "Déclarer une action",
      detail: "Passer du geste au suivi mesuré.",
      visual: {
        tone: "emerald",
        motif: "quiz",
        badge: { fr: "Déclaration", en: "Declaration" },
        chips: [
          { fr: "Suivi", en: "Tracking" },
          { fr: "Mesure", en: "Measurement" },
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
      title: "What to do with waste",
      detail: "Sorting cues, quick Q&A and second life.",
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
      title: "Compost guide",
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
      href: "/sections/weather",
      title: "Action weather",
      detail: "Pick the right moment, kit and risk level.",
      visual: {
        tone: "cyan",
        motif: "path",
        badge: { fr: "Fenêtre", en: "Window" },
        chips: [
          { fr: "Kit", en: "Kit" },
          { fr: "Risque", en: "Risk" },
        ],
      },
    },
    {
      href: "/actions/map",
      title: "Training map",
      detail: "Check the area before leaving.",
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
      href: "/actions/new",
      title: "Declare an action",
      detail: "Turn a gesture into a measured record.",
      visual: {
        tone: "emerald",
        motif: "quiz",
        badge: { fr: "Déclaration", en: "Declaration" },
        chips: [
          { fr: "Suivi", en: "Tracking" },
          { fr: "Mesure", en: "Measurement" },
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
