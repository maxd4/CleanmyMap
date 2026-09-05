import type { LucideIcon } from "lucide-react";
import { MapPinned, Recycle, Sprout, Target, Trash2 } from "lucide-react";

import type { LearnPracticeThemeId } from "@/lib/learning/practice/themes";

export type LocalizedText = {
  fr: string;
  en: string;
};

export type ThemeGuide = {
  href: string;
  title: LocalizedText;
  detail: LocalizedText;
  cta: LocalizedText;
  icon: LucideIcon;
};

export type ThemeAccordion = {
  title: LocalizedText;
  lead: LocalizedText;
  bullets: LocalizedText[];
};

export type ThemePanel = {
  summary: LocalizedText;
  rules: LocalizedText[];
  guides: ThemeGuide[];
  shortcuts: ThemeGuide[];
  accordion: ThemeAccordion;
};

export const THEME_LABELS: Record<
  LearnPracticeThemeId,
  { label: { fr: string; en: string }; hint: { fr: string; en: string } }
> = {
  tri: {
    label: { fr: "Bien trier", en: "Sort well" },
    hint: {
      fr: "Lire la consigne locale, puis isoler le doute.",
      en: "Read the local rule, then isolate uncertainty.",
    },
  },
  compost: {
    label: { fr: "Composter", en: "Compost" },
    hint: {
      fr: "Garder l’humide, le sec, l’air et la bonne dose d’eau.",
      en: "Keep wet, dry, air and the right amount of water.",
    },
  },
  reduire: {
    label: { fr: "Éviter les déchets abandonnés", en: "Avoid litter" },
    hint: {
      fr: "Prévoir la bonne issue avant d’agir.",
      en: "Plan the right outcome before acting.",
    },
  },
  numerique: {
    label: { fr: "Sobriété numérique", en: "Digital sobriety" },
    hint: {
      fr: "Éviter les futurs envois, puis nettoyer Gmail.",
      en: "Avoid future messages, then clean Gmail.",
    },
  },
};

export const THEME_PANELS: Record<Exclude<LearnPracticeThemeId, "numerique">, ThemePanel> = {
  tri: {
    summary: {
      fr: "Le tri reste lisible quand le contexte est clair et que le doute est isolé.",
      en: "Sorting stays readable when the context is clear and doubt is isolated.",
    },
    rules: [
      {
        fr: "Lire la consigne locale avant tout geste.",
        en: "Read the local rule before acting.",
      },
      {
        fr: "Séparer les objets douteux au lieu de deviner.",
        en: "Set doubtful items aside instead of guessing.",
      },
      {
        fr: "Choisir le flux le plus sûr si l’information manque.",
        en: "Choose the safest stream when information is missing.",
      },
    ],
    guides: [
      {
        href: "/sections/recycling",
        title: { fr: "Bien trier", en: "Sort well" },
        detail: {
          fr: "Repères de tri et erreurs courantes en une ligne.",
          en: "Sorting cues and common mistakes in one line.",
        },
        cta: { fr: "Ouvrir le guide", en: "Open guide" },
        icon: Recycle,
      },
      {
        href: "/actions/map",
        title: { fr: "Carte d’entraînement", en: "Training map" },
        detail: {
          fr: "Lire la carte pour trouver vite le bon point de tri.",
          en: "Read the map to find the right sorting point quickly.",
        },
        cta: { fr: "Lire la carte", en: "Read map" },
        icon: MapPinned,
      },
    ],
    shortcuts: [
      {
        href: "/sections/trash-spotter",
        title: { fr: "Signaler un déchet", en: "Report waste" },
        detail: {
          fr: "Utiliser le signalement quand le cas reste flou.",
          en: "Use reporting when the case remains unclear.",
        },
        cta: { fr: "Voir le signalement", en: "Open reporting" },
        icon: Trash2,
      },
    ],
    accordion: {
      title: { fr: "À éviter", en: "Avoid" },
      lead: {
        fr: "Le bloc reste fermé par défaut pour ne pas alourdir la lecture.",
        en: "This block stays closed by default to keep the read light.",
      },
      bullets: [
        {
          fr: "Mélanger les flux quand la consigne locale est visible.",
          en: "Mix streams when the local rule is visible.",
        },
        {
          fr: "Forcer un tri incertain dans le mauvais bac.",
          en: "Force uncertain sorting into the wrong bin.",
        },
        {
          fr: "Laisser un doute sans le mettre à part.",
          en: "Leave doubt without setting it aside.",
        },
      ],
    },
  },
  compost: {
    summary: {
      fr: "Le compost tient quand les matières restent équilibrées et aérées.",
      en: "Compost works when materials stay balanced and airy.",
    },
    rules: [
      {
        fr: "Vérifier ce qui est accepté localement.",
        en: "Check what is locally accepted.",
      },
      {
        fr: "Garder des matières humides et sèches en équilibre.",
        en: "Keep wet and dry materials in balance.",
      },
      {
        fr: "Éviter de contaminer le flux avec du trop souillé.",
        en: "Avoid contaminating the stream with overly soiled waste.",
      },
    ],
    guides: [
      {
        href: "/sections/compost",
        title: { fr: "Composter", en: "Compost" },
        detail: {
          fr: "Composter chez soi ou avec une structure locale.",
          en: "Compost at home or with a local group.",
        },
        cta: { fr: "Ouvrir le guide", en: "Open guide" },
        icon: Sprout,
      },
      {
        href: "/actions/new",
        title: { fr: "Réduire à la source", en: "Reduce at source" },
        detail: {
          fr: "Réduire à la source pour alléger le compost.",
          en: "Reduce at source to lighten compost.",
        },
        cta: { fr: "Ouvrir l’action", en: "Open action" },
        icon: Target,
      },
    ],
    shortcuts: [
      {
        href: "/sections/recycling",
        title: { fr: "Bien trier", en: "Sort well" },
        detail: {
          fr: "Revenir au tri si le doute sort du compost.",
          en: "Return to sorting if doubt leaves compost.",
        },
        cta: { fr: "Voir le tri", en: "Open sorting" },
        icon: Recycle,
      },
    ],
    accordion: {
      title: { fr: "Quand ça coince", en: "When it gets stuck" },
      lead: {
        fr: "Le détail utile reste caché tant qu’il ne sert pas.",
        en: "Useful detail stays hidden until it helps.",
      },
      bullets: [
        {
          fr: "Lieu ou volume inadapté à un compost fiable.",
          en: "Place or volume not suited for reliable composting.",
        },
        {
          fr: "Manque d’aération ou excès d’humidité.",
          en: "Lack of air or too much moisture.",
        },
        {
          fr: "Déchets trop souillés pour rester dans le flux compost.",
          en: "Waste too soiled to stay in the compost stream.",
        },
      ],
    },
  },
  reduire: {
    summary: {
      fr: "Éviter les déchets abandonnés commence avant le geste, puis se règle au bon endroit.",
      en: "Avoiding litter starts before the gesture and ends in the right place.",
    },
    rules: [
      {
        fr: "Prévoir l’issue du déchet avant d’agir.",
        en: "Plan the waste's ending before acting.",
      },
      {
        fr: "Choisir la filière ou le point de collecte adapté.",
        en: "Choose the right stream or drop-off point.",
      },
      {
        fr: "Signaler quand aucun bon point n’apparaît.",
        en: "Report it when no clear point is available.",
      },
    ],
    guides: [
      {
        href: "/sections/trash-spotter",
        title: { fr: "Signaler un dépôt", en: "Report litter" },
        detail: {
          fr: "Utiliser le signalement quand un déchet reste bloqué.",
          en: "Use reporting when waste remains stuck.",
        },
        cta: { fr: "Signaler", en: "Report" },
        icon: Trash2,
      },
      {
        href: "/actions/map",
        title: { fr: "Trouver la bonne filière", en: "Find the right stream" },
        detail: {
          fr: "Chercher la solution locale avant d’abandonner le déchet.",
          en: "Find the local solution before leaving waste behind.",
        },
        cta: { fr: "Ouvrir la carte", en: "Open map" },
        icon: MapPinned,
      },
      {
        href: "/actions/new",
        title: { fr: "Réduire à la source", en: "Reduce at source" },
        detail: {
          fr: "Éviter de créer le déchet avant qu’il devienne un problème.",
          en: "Avoid creating waste before it becomes a problem.",
        },
        cta: { fr: "Ouvrir l’action", en: "Open action" },
        icon: Target,
      },
    ],
    shortcuts: [],
    accordion: {
      title: { fr: "À garder en tête", en: "Keep in mind" },
      lead: {
        fr: "La campagne rappelle quatre cas concrets, puis les détails restent repliés.",
        en: "The campaign highlights four concrete cases, then the details stay collapsed.",
      },
      bullets: [
        {
          fr: "Un mégot ne disparaît pas, il se garde jusqu’au bon contenant.",
          en: "A butt does not disappear; it stays with you until the right container.",
        },
        {
          fr: "Une canette ou une bouteille a une filière claire, pas un abandon.",
          en: "A can or bottle has a clear stream, not an abandonment.",
        },
        {
          fr: "Un encombrant va vers une solution locale, jamais dans la rue.",
          en: "A bulky item goes to a local solution, never to the street.",
        },
      ],
    },
  },
};
