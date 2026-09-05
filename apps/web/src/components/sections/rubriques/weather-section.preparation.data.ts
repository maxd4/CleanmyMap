import {
  CalendarDays,
  Download,
  Droplets,
  Heart,
  Leaf,
  Lightbulb,
  Mountain,
  Package,
  Recycle,
  Share2,
  ShieldCheck,
  Users,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

export type PreparationHeroStat = {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
};

export type PreparationKitSection = {
  icon: LucideIcon;
  title: string;
  tone: "emerald" | "blue" | "amber" | "violet";
  items: Array<{ label: string; qty: string }>;
};

export type PreparationStep = {
  icon: LucideIcon;
  label: string;
  title: string;
  tone: "emerald" | "sky";
  points: string[];
};

type UsefulBlockBase = {
  icon: LucideIcon;
  title: string;
  tone: "emerald" | "rose" | "sky" | "amber";
};

export type UsefulBlock =
  | (UsefulBlockBase & { points: string[] })
  | (UsefulBlockBase & { chips: string[] })
  | (UsefulBlockBase & { reflexes: Array<{ icon: LucideIcon; label: string }> });

export type PreparationQuickAction = {
  icon: LucideIcon;
  tone: "emerald" | "sky" | "violet" | "amber";
  title: string;
  description: string;
  href: string;
};

export function buildPreparationHeroStats(
  fr: boolean,
  durationLabel: string,
  gearPreview: string,
  effortLabel: string,
): PreparationHeroStat[] {
  return [
    {
      icon: CalendarDays,
      label: fr ? "Durée indicative" : "Indicative duration",
      value: durationLabel,
      note: fr ? "1h à 2h selon le site" : "1h to 2h depending on the site",
    },
    {
      icon: Package,
      label: fr ? "Kit recommandé" : "Recommended kit",
      value: gearPreview,
      note: fr ? "léger et pratique" : "light and practical",
    },
    {
      icon: Heart,
      label: fr ? "Niveau d'effort" : "Effort level",
      value: effortLabel,
      note: fr ? "adapté à tous" : "suitable for most teams",
    },
    {
      icon: Mountain,
      label: fr ? "Accessibilité / terrain" : "Accessibility / terrain",
      value: fr ? "Urbain ou naturel" : "Urban or natural",
      note: fr ? "varié selon la zone" : "varies by area",
    },
  ];
}

export function buildPreparationKitSections(fr: boolean): PreparationKitSection[] {
  return [
    {
      icon: ShieldCheck,
      title: fr ? "Protection" : "Protection",
      tone: "emerald",
      items: [
        { label: fr ? "Gants de protection" : "Protective gloves", qty: "x1 paire" },
        { label: fr ? "Gilet haute visibilité" : "High-vis vest", qty: "x1" },
        { label: fr ? "Gel hydroalcoolique" : "Hand sanitizer", qty: "x1" },
        { label: fr ? "Masque (si besoin)" : "Mask (if needed)", qty: "x1" },
      ],
    },
    {
      icon: Package,
      title: fr ? "Collecte" : "Collection",
      tone: "blue",
      items: [
        { label: fr ? "Sacs résistants" : "Strong bags", qty: "x2" },
        { label: fr ? "Pinces de ramassage" : "Grabbers", qty: "x1" },
        { label: fr ? "Seau / bac (optionnel)" : "Bucket / bin (optional)", qty: "x1" },
      ],
    },
    {
      icon: Leaf,
      title: fr ? "Confort" : "Comfort",
      tone: "amber",
      items: [
        { label: fr ? "Eau" : "Water", qty: "x1 L+" },
        { label: fr ? "Casquette / chapeau" : "Cap / hat", qty: "x1" },
        { label: fr ? "Crème solaire" : "Sunscreen", qty: "x1" },
      ],
    },
    {
      icon: Recycle,
      title: fr ? "Tri / signalement" : "Sorting / reporting",
      tone: "violet",
      items: [
        { label: fr ? "Guide du tri (mémo)" : "Sorting memo", qty: "x1" },
        { label: fr ? "Sac dédié aux recyclables" : "Separate recyclables bag", qty: "x1" },
        { label: fr ? "Application ou carnet photos" : "App or photo notebook", qty: "x1" },
      ],
    },
  ];
}

export function buildPreparationSteps(fr: boolean): PreparationStep[] {
  return [
    {
      icon: CalendarDays,
      label: fr ? "Avant" : "Before",
      title: fr ? "Préparer le départ" : "Prepare to leave",
      tone: "emerald",
      points: [
        fr ? "Vérifiez la météo et adaptez votre tenue." : "Check the weather and adapt your clothes.",
        fr ? "Préparez un kit léger et complet." : "Prepare a light, complete kit.",
        fr ? "Informez un proche de votre sortie." : "Tell someone where you are going.",
        fr ? "Repérez les accès et stationnements." : "Identify access points and parking.",
      ],
    },
    {
      icon: Users,
      label: fr ? "Pendant" : "During",
      title: fr ? "Rester attentif sur le terrain" : "Stay attentive in the field",
      tone: "sky",
      points: [
        fr ? "Restez en groupe et attentifs aux autres." : "Stay together and watch out for each other.",
        fr ? "Respectez le lieu et la faune locale." : "Respect the site and local wildlife.",
        fr ? "Ramassez uniquement les déchets sûrs." : "Pick up only safe waste.",
        fr ? "Faites le tri au fur et à mesure." : "Sort as you go.",
      ],
    },
    {
      icon: Leaf,
      label: fr ? "Après" : "After",
      title: fr ? "Clore et valoriser l’action" : "Close and share the action",
      tone: "emerald",
      points: [
        fr ? "Triez les déchets selon les consignes locales." : "Sort waste according to local instructions.",
        fr ? "Prenez quelques photos pour valoriser l’action." : "Take a few photos to highlight the action.",
        fr ? "Nettoyez et rangez le matériel." : "Clean and store the gear.",
        fr ? "Partagez votre expérience et inspirez d’autres personnes !" : "Share your experience and inspire others!",
      ],
    },
  ];
}

export function buildUsefulBlocks(fr: boolean): UsefulBlock[] {
  return [
    {
      icon: Leaf,
      title: fr ? "Bonnes pratiques" : "Good practices",
      tone: "emerald",
      points: [
        fr ? "Ramasser sans déplacer les éléments naturels." : "Pick up litter without moving natural elements.",
        fr ? "Ne pas déranger la faune et la flore." : "Do not disturb fauna and flora.",
        fr ? "Respecter la tranquillité des lieux et des usagers." : "Respect the quiet of the area and its users.",
      ],
    },
    {
      icon: TriangleAlert,
      title: fr ? "À éviter / à ne pas ramasser" : "Avoid / do not pick up",
      tone: "rose",
      points: [
        fr ? "Déchets dangereux (aiguilles, amiante, produits chimiques)." : "Hazardous waste (needles, asbestos, chemicals).",
        fr ? "Objets suspects ou non identifiables." : "Suspicious or unidentified objects.",
        fr ? "Déchets enfouis ou collés à la terre." : "Buried waste or waste stuck to the ground.",
      ],
    },
    {
      icon: Recycle,
      title: fr ? "Déchets fréquents" : "Common waste",
      tone: "sky",
      chips: [
        fr ? "Mégots" : "Cigarette butts",
        fr ? "Plastiques" : "Plastics",
        fr ? "Canettes" : "Cans",
        fr ? "Emballages" : "Packaging",
        fr ? "Verre" : "Glass",
        fr ? "Papiers" : "Paper",
      ],
    },
    {
      icon: Lightbulb,
      title: fr ? "Petits réflexes utiles" : "Useful reflexes",
      tone: "amber",
      reflexes: [
        { icon: Droplets, label: fr ? "Utilisez l'eau avec parcimonie" : "Use water sparingly" },
        { icon: Recycle, label: fr ? "Préférez des matériaux réutilisables" : "Prefer reusable materials" },
        { icon: Leaf, label: fr ? "Ne laissez aucun déchet sur place" : "Leave no litter behind" },
        { icon: Heart, label: fr ? "Merci la nature vous dit merci !" : "Nature says thank you!" },
      ],
    },
  ];
}

export function buildQuickActions(fr: boolean): PreparationQuickAction[] {
  return [
    {
      icon: Download,
      tone: "emerald",
      title: fr ? "Télécharger la checklist" : "Download the checklist",
      description: fr
        ? "La fiche récapitulative à imprimer ou à garder sous la main."
        : "A concise sheet to print or keep close by.",
      href: "/sections/reports",
    },
    {
      icon: Package,
      tone: "sky",
      title: fr ? "Voir le matériel conseillé" : "See the recommended gear",
      description: fr
        ? "Une sélection d'équipements pratiques et responsables."
        : "A selection of practical, responsible gear.",
      href: "/sections/weather",
    },
    {
      icon: Recycle,
      tone: "violet",
      title: fr ? "Comprendre le tri" : "Understand sorting",
      description: fr
        ? "Mieux trier pour mieux valoriser chaque déchet collecté."
        : "Sort better to value every collected item.",
      href: "/sections/recycling",
    },
    {
      icon: Share2,
      tone: "amber",
      title: fr ? "Partager la fiche" : "Share the sheet",
      description: fr
        ? "Diffuser cette fiche à vos amis et à votre équipe."
        : "Share this sheet with your friends and team.",
      href: "/sections/community",
    },
  ];
}
