export type LearnLocale = "fr" | "en";

export type LearnLinkCard = {
  href: string;
  title: string;
  detail: string;
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
    },
    {
      href: "/learn/sentrainer",
      title: "S'entraîner",
      detail: "Ancrer les repères avec des quiz courts et du rappel actif.",
    },
    {
      href: "/learn/bonnes-pratiques",
      title: "Bonnes pratiques",
      detail: "Retrouver les gestes utiles et les guides courts.",
    },
    {
      href: "/learn/ressources",
      title: "Ressources",
      detail: "Accéder au kit, aux repères et aux rendez-vous utiles.",
    },
  ],
  en: [
    {
      href: "/learn/comprendre",
      title: "Understand",
      detail: "Read the context, the order of magnitude and the link to methodology.",
    },
    {
      href: "/learn/sentrainer",
      title: "Practice",
      detail: "Anchor the cues with short quizzes and active recall.",
    },
    {
      href: "/learn/bonnes-pratiques",
      title: "Best practices",
      detail: "Find useful gestures and short guides.",
    },
    {
      href: "/learn/ressources",
      title: "Resources",
      detail: "Access the kit, references and useful events.",
    },
  ],
};

export const LEARN_PRACTICE_LINKS: Record<LearnLocale, LearnLinkCard[]> = {
  fr: [
    {
      href: "/sections/guide",
      title: "Guide terrain",
      detail: "Consignes courtes pour préparer et sécuriser une sortie.",
    },
    {
      href: "/sections/recycling",
      title: "Que faire des déchets ?",
      detail: "Repères de tri, Q&A et seconde vie.",
    },
    {
      href: "/sections/compost",
      title: "Guide compost",
      detail: "Composter chez soi, en quartier ou en association.",
    },
    {
      href: "/sections/weather",
      title: "Météo d'action",
      detail: "Choisir le bon moment, le bon kit et le bon niveau de risque.",
    },
    {
      href: "/actions/new",
      title: "Déclarer une action",
      detail: "Passer rapidement du geste au suivi mesuré.",
    },
    {
      href: "/actions/map",
      title: "Carte d'entraînement",
      detail: "Vérifier la zone avant de partir sur le terrain.",
    },
    {
      href: "/sections/trash-spotter",
      title: "Signalement Déchets",
      detail: "Remonter un hotspot avec le bon contexte.",
    },
  ],
  en: [
    {
      href: "/sections/guide",
      title: "Field guide",
      detail: "Short instructions to prepare and secure an outing.",
    },
    {
      href: "/sections/recycling",
      title: "What to do with waste",
      detail: "Sorting cues, Q&A and second life.",
    },
    {
      href: "/sections/compost",
      title: "Compost guide",
      detail: "Compost at home, in a neighborhood site or with an association.",
    },
    {
      href: "/sections/weather",
      title: "Action weather",
      detail: "Pick the right moment, kit and risk level.",
    },
    {
      href: "/actions/new",
      title: "Declare an action",
      detail: "Turn a gesture into a measured record quickly.",
    },
    {
      href: "/actions/map",
      title: "Training map",
      detail: "Check the area before heading to the field.",
    },
    {
      href: "/sections/trash-spotter",
      title: "Trash spotting",
      detail: "Report a hotspot with the right context.",
    },
  ],
};

export const LEARN_RESOURCE_EVENTS: LearnEvent[] = [
  {
    title: "Grande Collecte de Printemps - Paris 14",
    start: new Date(2026, 3, 25, 10, 0),
    end: new Date(2026, 3, 25, 14, 0),
    allDay: false,
  },
  {
    title: "Atelier Recyclage Créatif",
    start: new Date(2026, 3, 28, 18, 0),
    end: new Date(2026, 3, 28, 20, 0),
    allDay: false,
  },
];
