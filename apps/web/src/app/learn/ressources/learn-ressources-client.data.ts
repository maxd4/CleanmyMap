import type { LucideIcon } from "lucide-react";
import { format, type Locale } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { BookOpen, BellOff, BookmarkCheck, CalendarDays, CloudOff, Clock3, Download, Inbox, KeyRound, Leaf, Paperclip, Recycle, RefreshCcw, Sparkles, TriangleAlert, Trash2, UserX } from "lucide-react";

import type { LearnEvent, LearnLocalizedText, LearnLocale } from "@/lib/learning/learn-rubric-data";
import { LEARN_RESOURCE_EVENTS } from "@/lib/learning/learn-rubric-data";

export type LearnText = LearnLocalizedText;

export type ResourceTone = "amber" | "cyan" | "emerald";

export type ResourceSpotlight = {
  key: string;
  icon: LucideIcon;
  tone: ResourceTone;
  title: LearnText;
  lead: LearnText;
  items: LearnText[];
  action?: {
    href: string;
    label: LearnText;
  };
};

export type ArtworkReference = {
  key: string;
  title: LearnText;
  artist: LearnText;
  material: LearnText;
  context: LearnText[];
  interest: LearnText;
  image: {
    src: string;
    alt: LearnText;
    caption: LearnText;
  };
  source: {
    href: string;
    label: LearnText;
  };
};

export type ResourceShortcut = {
  href: string;
  eyebrow: LearnText;
  title: LearnText;
  detail: LearnText;
  label: LearnText;
};

export type MailboxCleanupStep = {
  icon: LucideIcon;
  title: LearnText;
  detail: LearnText;
};

export type BrowserHistoryCleanupStep = {
  icon: LucideIcon;
  title: LearnText;
  detail: LearnText;
};

export type DigitalMaintenanceTopic = {
  icon: LucideIcon;
  title: LearnText;
  detail: LearnText;
  cadence: LearnText;
};

export type SortingCue = {
  icon: LucideIcon;
  tone: ResourceTone;
  title: LearnText;
  text: LearnText;
};

export const RESOURCE_TONE_CLASSES = {
  amber: {
    shell: "bg-[linear-gradient(180deg,rgba(255,247,229,0.98),rgba(255,255,255,0.96))]",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "text-amber-700",
    dot: "bg-amber-600",
    border: "border-amber-200",
    glow: "from-amber-200/16 via-amber-100/10 to-transparent",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
  },
  cyan: {
    shell: "bg-[linear-gradient(180deg,rgba(255,250,238,0.98),rgba(255,255,255,0.96))]",
    badge: "border-orange-200 bg-orange-50 text-orange-900",
    accent: "text-orange-700",
    dot: "bg-orange-600",
    border: "border-orange-200",
    glow: "from-orange-200/16 via-amber-100/10 to-transparent",
    chip: "border-orange-200 bg-orange-50 text-orange-800",
  },
  emerald: {
    shell: "bg-[linear-gradient(180deg,rgba(255,248,232,0.98),rgba(255,255,255,0.96))]",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "text-amber-700",
    dot: "bg-amber-600",
    border: "border-amber-200",
    glow: "from-amber-200/16 via-orange-100/10 to-transparent",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
  },
} as const;

function formatEventLabel(locale: LearnLocale, event: Pick<LearnEvent, "start">) {
  const resolvedLocale: Locale = locale === "fr" ? fr : enUS;
  return `${format(event.start, "d MMM", { locale: resolvedLocale })} · ${format(
    event.start,
    "HH:mm",
    { locale: resolvedLocale },
  )}`;
}

export const RESOURCE_SPOTLIGHTS: ResourceSpotlight[] = [
  {
    key: "kit",
    icon: Sparkles,
    tone: "amber",
    title: { fr: "Kit terrain", en: "Field kit" },
    lead: {
      fr: "Une pochette courte pour partir vite.",
      en: "A short kit to leave quickly.",
    },
    items: [
      { fr: "Protocole sécurité", en: "Safety protocol" },
      { fr: "Guide référent local", en: "Local coordinator guide" },
      { fr: "Checklist de sortie", en: "Departure checklist" },
    ],
  },
  {
    key: "sorting",
    icon: Recycle,
    tone: "emerald",
    title: { fr: "Repères de tri", en: "Sorting cues" },
    lead: {
      fr: "Les cas courants, sans jargon.",
      en: "Common cases, no jargon.",
    },
    items: [
      { fr: "Mégots: à part et au sec", en: "Butts: separate and dry" },
      { fr: "Verre / métal: séparer les flux", en: "Glass / metal: separate flows" },
      { fr: "Mixte: isoler et noter", en: "Mixed: isolate and note" },
    ],
    action: {
      href: "/sections/recycling",
      label: { fr: "Ouvrir l'assistant tri", en: "Open sorting assistant" },
    },
  },
  {
    key: "events",
    icon: CalendarDays,
    tone: "cyan",
    title: { fr: "Événements utiles", en: "Useful events" },
    lead: {
      fr: "Les rendez-vous visibles tout de suite.",
      en: "The meetups visible right away.",
    },
    items: LEARN_RESOURCE_EVENTS.map((event) => ({
      fr: `${formatEventLabel("fr", event)} · ${event.title}`,
      en: `${formatEventLabel("en", event)} · ${event.title}`,
    })),
    action: {
      href: "#calendrier",
      label: { fr: "Voir le calendrier", en: "View calendar" },
    },
  },
];

export const RESOURCE_SHORTCUTS: ResourceShortcut[] = [
  {
    href: "/sections/recycling",
    eyebrow: { fr: "Rubrique existante", en: "Existing rubric" },
    title: { fr: "Assistant tri", en: "Sorting assistant" },
    detail: {
      fr: "Raccourci direct vers les consignes de tri déjà publiées.",
      en: "Direct shortcut to the published sorting cues.",
    },
    label: { fr: "Ouvrir l'assistant tri", en: "Open sorting assistant" },
  },
  {
    href: "/sections/compost",
    eyebrow: { fr: "Rubrique existante", en: "Existing rubric" },
    title: { fr: "Guide compost", en: "Compost guide" },
    detail: {
      fr: "Accès immédiat au guide compost pour agir sans détour.",
      en: "Immediate access to the compost guide without detours.",
    },
    label: { fr: "Ouvrir le guide compost", en: "Open the compost guide" },
  },
  {
    href: "/learn/comprendre",
    eyebrow: { fr: "Retour de contexte", en: "Back to context" },
    title: { fr: "Comprendre", en: "Understand" },
    detail: {
      fr: "Revenir à la vulgarisation quand il faut remettre le sujet en cadre.",
      en: "Return to the explainer when the subject needs more framing.",
    },
    label: { fr: "Voir le contexte", en: "See the context" },
  },
];

export const MAILBOX_CLEANUP_STEPS: MailboxCleanupStep[] = [
  {
    icon: Inbox,
    title: {
      fr: "Identifier les flux à couper",
      en: "Identify the flows to cut",
    },
    detail: {
      fr: "Dans Gmail, ouvre les messages récurrents que tu ne lis jamais et repère les expéditeurs à supprimer.",
      en: "In Gmail, open recurring messages you never read and note the senders to remove.",
    },
  },
  {
    icon: BellOff,
    title: {
      fr: "Se désabonner depuis Gmail",
      en: "Unsubscribe from Gmail",
    },
    detail: {
      fr: "Passe par « More » puis « Manage subscriptions » ; si ton interface affiche le raccourci /sub#, tu peux l'utiliser aussi.",
      en: "Open More, then Manage subscriptions; if your interface shows the /sub# shortcut, you can use it too.",
    },
  },
  {
    icon: Trash2,
    title: {
      fr: "Vider spam et corbeille",
      en: "Empty spam and trash",
    },
    detail: {
      fr: "Supprime les spams, vide la corbeille, puis garde ce nettoyage tous les trimestres pour éviter l'accumulation.",
      en: "Delete spam, empty trash, and repeat the cleanup every quarter to avoid buildup.",
    },
  },
];

export const BROWSER_HISTORY_CLEANUP_STEPS: BrowserHistoryCleanupStep[] = [
  {
    icon: Clock3,
    title: {
      fr: "Ouvrir l'écran de nettoyage",
      en: "Open the cleanup screen",
    },
    detail: {
      fr: "Va dans l'historique ou dans les paramètres de confidentialité du navigateur, puis choisis la suppression des données de navigation.",
      en: "Open the browser history or privacy settings, then choose to delete browsing data.",
    },
  },
  {
    icon: Trash2,
    title: {
      fr: "Choisir « Toute durée »",
      en: "Choose \"All time\"",
    },
    detail: {
      fr: "Sélectionne la période « toute durée », puis coche seulement l'historique et, si utile, le cache. Ne coche pas tout par défaut.",
      en: "Select the \"all time\" range, then tick only history and, if useful, the cache. Do not select everything by default.",
    },
  },
  {
    icon: KeyRound,
    title: {
      fr: "Garder les options sensibles décochées",
      en: "Keep sensitive options off",
    },
    detail: {
      fr: "Laisse décochés les mots de passe enregistrés et les paramètres de site, sauf cas particulier de dépannage ou d'appareil partagé.",
      en: "Leave saved passwords and site settings unchecked, except for special troubleshooting or shared-device cases.",
    },
  },
];

export const DIGITAL_MAINTENANCE_TOPICS: DigitalMaintenanceTopic[] = [
  {
    icon: Paperclip,
    title: {
      fr: "Pièces jointes volumineuses",
      en: "Large attachments",
    },
    detail: {
      fr: "Supprime les mails lourds, surtout les newsletters et pièces jointes que tu n'ouvres jamais.",
      en: "Delete heavy emails, especially newsletters and attachments you never open.",
    },
    cadence: {
      fr: "Tous les trimestres",
      en: "Every quarter",
    },
  },
  {
    icon: Download,
    title: {
      fr: "Téléchargements et doublons",
      en: "Downloads and duplicates",
    },
    detail: {
      fr: "Vide le dossier Téléchargements et élimine les doublons de PDFs, images et archives.",
      en: "Empty the Downloads folder and remove duplicate PDFs, images, and archives.",
    },
    cadence: {
      fr: "Chaque mois ou au trimestre",
      en: "Monthly or quarterly",
    },
  },
  {
    icon: CloudOff,
    title: {
      fr: "Corbeilles cloud",
      en: "Cloud trash",
    },
    detail: {
      fr: "Pense aux corbeilles de Google Drive, Photos, OneDrive ou iCloud qui gardent encore des fichiers supprimés.",
      en: "Check the trash bins in Google Drive, Photos, OneDrive, or iCloud, which still keep deleted files.",
    },
    cadence: {
      fr: "Tous les trimestres",
      en: "Every quarter",
    },
  },
  {
    icon: RefreshCcw,
    title: {
      fr: "Synchro automatique",
      en: "Automatic sync",
    },
    detail: {
      fr: "Garde synchronisés seulement les dossiers utiles et coupe ce qui ne sert pas au quotidien.",
      en: "Keep only the folders you actually need synchronized and turn off the rest.",
    },
    cadence: {
      fr: "Une fois par semestre puis à chaque changement",
      en: "Once per semester, then on change",
    },
  },
  {
    icon: BellOff,
    title: {
      fr: "Notifications inutiles",
      en: "Unnecessary notifications",
    },
    detail: {
      fr: "Désactive les alertes des newsletters, applis et sites qui ne méritent pas ton attention.",
      en: "Disable alerts from newsletters, apps, and sites that do not deserve your attention.",
    },
    cadence: {
      fr: "Une fois puis revue trimestrielle",
      en: "Once, then a quarterly review",
    },
  },
  {
    icon: BookmarkCheck,
    title: {
      fr: "Onglets et favoris",
      en: "Tabs and bookmarks",
    },
    detail: {
      fr: "Ferme les onglets oubliés et trie les favoris pour éviter une accumulation inutile.",
      en: "Close forgotten tabs and sort bookmarks to avoid unnecessary accumulation.",
    },
    cadence: {
      fr: "Chaque mois",
      en: "Every month",
    },
  },
  {
    icon: UserX,
    title: {
      fr: "Comptes inutiles",
      en: "Unused accounts",
    },
    detail: {
      fr: "Supprime les comptes secondaires qui ne servent plus, surtout sur les services peu utilisés.",
      en: "Delete secondary accounts you no longer need, especially on rarely used services.",
    },
    cadence: {
      fr: "Chaque semestre",
      en: "Every semester",
    },
  },
];

export const ARTWORK_REFERENCES: ArtworkReference[] = [
  {
    key: "vik-muniz-pictures-of-garbage",
    title: { fr: "Pictures of Garbage", en: "Pictures of Garbage" },
    artist: { fr: "Vik Muniz", en: "Vik Muniz" },
    material: { fr: "Déchets de décharge", en: "Landfill waste" },
    context: [
      {
        fr: "Vik Muniz a construit cette série avec des catadores du gigantesque dépôt de Jardim Gramacho, près de Rio de Janeiro. Les portraits sont ensuite photographiés à grande échelle, ce qui transforme des déchets ordinaires en images immédiatement lisibles.",
        en: "Vik Muniz built this series with catadores from the giant Jardim Gramacho landfill near Rio de Janeiro. The portraits are then photographed at a large scale, turning ordinary waste into immediately readable images.",
      },
      {
        fr: "L'oeuvre relie création artistique, dignité des travailleurs du tri et récit social. Elle montre qu'un matériau rejeté peut devenir mémoire, représentation et prise de parole.",
        en: "The work links artistic creation, the dignity of sorting workers, and social storytelling. It shows that rejected material can become memory, representation, and a voice.",
      },
    ],
    interest: {
      fr: "Très utile pour CleanMyMap: le déchet n'y est pas seulement matière, il devient portrait, histoire collective et support de sensibilisation.",
      en: "Very useful for CleanMyMap: waste is not just material here, it becomes portrait, collective story, and a tool for awareness.",
    },
    image: {
      src: "https://www.artchive.com/wp-content/uploads/2024/08/marat-sebastiao-pictures-of-garbage-vik-muniz-2008.jpg",
      alt: {
        fr: "Marat (Sebastião) de la série Pictures of Garbage de Vik Muniz",
        en: "Marat (Sebastião) from Vik Muniz's Pictures of Garbage series",
      },
      caption: {
        fr: "Photo de l'oeuvre sur Artchive.",
        en: "Artwork photo on Artchive.",
      },
    },
    source: {
      href: "https://www.artchive.com/artwork/marat-sebastiao-pictures-of-garbage-vik-muniz-2008/",
      label: { fr: "Source", en: "Source" },
    },
  },
  {
    key: "aurora-robson-the-great-indoors",
    title: { fr: "The Great Indoors", en: "The Great Indoors" },
    artist: { fr: "Aurora Robson", en: "Aurora Robson" },
    material: { fr: "Environ 15 000 bouteilles plastiques", en: "About 15,000 plastic bottles" },
    context: [
      {
        fr: "Cette installation monumentale rassemble environ 15 000 bouteilles PET ramassées dans les rues de New York. Aurora Robson les a peintes, assemblées et rivetées pour composer un espace immersif traversé par la lumière.",
        en: "This monumental installation brings together about 15,000 PET bottles collected from the streets of New York. Aurora Robson painted, assembled, and riveted them to create an immersive space crossed by light.",
      },
      {
        fr: "L'oeuvre fonctionne comme une architecture organique: on reconnaît la bouteille, mais elle perd sa fonction initiale pour devenir matière sculpturale et paysage intérieur.",
        en: "The work behaves like an organic architecture: the bottle remains recognizable, but its original function disappears and it becomes sculptural material and interior landscape.",
      },
    ],
    interest: {
      fr: "Intéressant pour CleanMyMap car la bouteille jetée devient volume, lumière et environnement total au lieu de rester un simple résidu.",
      en: "Useful for CleanMyMap because the discarded bottle becomes volume, light, and a total environment instead of remaining a simple residue.",
    },
    image: {
      src: "https://images.squarespace-cdn.com/content/v1/5a0f269fe9bfdf155893fe51/1517526724548-BZVG9KRCBLH8445VYLH4/greatindoorsfront.jpg",
      alt: {
        fr: "Vue de l'installation The Great Indoors d'Aurora Robson",
        en: "View of Aurora Robson's The Great Indoors installation",
      },
      caption: {
        fr: "Photo publiée sur le site d'Aurora Robson.",
        en: "Photo published on Aurora Robson's site.",
      },
    },
    source: {
      href: "https://www.aurorarobson.com/the-great-indoors",
      label: { fr: "Source", en: "Source" },
    },
  },
  {
    key: "el-anatsui-capsules",
    title: { fr: "Sculptures textiles en capsules", en: "Textile sculptures from caps" },
    artist: { fr: "El Anatsui", en: "El Anatsui" },
    material: { fr: "Capsules et métaux récupérés", en: "Recovered caps and metals" },
    context: [
      {
        fr: "El Anatsui assemble des capsules de bouteilles et d'autres métaux récupérés pour obtenir de vastes surfaces souples, proches du textile. Les pièces comme Man's Cloth et Woman's Cloth dialoguent avec les traditions de tissage d'Afrique de l'Ouest.",
        en: "El Anatsui assembles bottle caps and other recovered metals into vast, flexible surfaces that resemble textiles. Pieces such as Man's Cloth and Woman's Cloth converse with West African weaving traditions.",
      },
      {
        fr: "Le résultat est à la fois sculptural et historique: la matière usée devient drapé, mémoire et réflexion sur la consommation et l'après-colonial.",
        en: "The result is both sculptural and historical: worn material becomes drapery, memory, and a reflection on consumption and the postcolonial condition.",
      },
    ],
    interest: {
      fr: "Très proche de l'esprit CleanMyMap: on part d'un rebut industriel pour produire une surface noble, lisible et chargée de récit.",
      en: "Very close to the CleanMyMap spirit: an industrial leftover becomes a noble, readable surface loaded with narrative.",
    },
    image: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/El_Anatsui_-_Man%27s_Cloth_%28close_up%29.jpg",
      alt: {
        fr: "Détail de Man's Cloth d'El Anatsui",
        en: "Detail of El Anatsui's Man's Cloth",
      },
      caption: {
        fr: "Détail publié sur Wikimedia Commons.",
        en: "Detail published on Wikimedia Commons.",
      },
    },
    source: {
      href: "https://www.britishmuseum.org/collection/object/E_Af2002-10-2",
      label: { fr: "Source", en: "Source" },
    },
  },
  {
    key: "alejandro-duran-washed-up",
    title: { fr: "Washed Up", en: "Washed Up" },
    artist: { fr: "Alejandro Durán", en: "Alejandro Durán" },
    material: { fr: "Déchets plastiques échoués", en: "Washed-up plastic debris" },
    context: [
      {
        fr: "Alejandro Durán photographie et compose des paysages avec les plastiques arrivés sur la côte caribéenne du Mexique. Il y a identifié des déchets provenant de dizaines de pays, ce qui donne à la série une portée très concrète et mondiale.",
        en: "Alejandro Durán photographs and composes landscapes with plastics that wash up on Mexico's Caribbean coast. He has identified waste from dozens of countries, giving the series a very concrete and global scope.",
      },
      {
        fr: "La couleur et la mise en scène séduisent d'abord, puis la lecture se renverse: ce qui ressemble à un paysage naturel est en réalité une cartographie de la pollution.",
        en: "Color and staging attract first, then the reading flips: what looks like a natural landscape is actually a map of pollution.",
      },
    ],
    interest: {
      fr: "C'est pertinent pour CleanMyMap parce que l'oeuvre transforme des déchets abandonnés en paysage lisible, donc en preuve visuelle de l'impact.",
      en: "It matters for CleanMyMap because the work turns abandoned waste into a readable landscape, and therefore into visual proof of impact.",
    },
    image: {
      src: "https://images.squarespace-cdn.com/content/v1/5de0a7f224b1dd71d8856f9f/1598597871812-TR35HADZ5ZTVH7ODSA5Y/Amanecer%2B%28Dawn%29%2B2011.jpg",
      alt: {
        fr: "Amanecer (Dawn), une image de la série Washed Up d'Alejandro Durán",
        en: "Amanecer (Dawn), an image from Alejandro Durán's Washed Up series",
      },
      caption: {
        fr: "Photo publiée sur le site d'Alejandro Durán.",
        en: "Photo published on Alejandro Durán's site.",
      },
    },
    source: {
      href: "https://alejandroduran.com/photoseries",
      label: { fr: "Source", en: "Source" },
    },
  },
  {
    key: "mandy-barker-hong-kong-soup",
    title: { fr: "Hong Kong Soup: 1826", en: "Hong Kong Soup: 1826" },
    artist: { fr: "Mandy Barker", en: "Mandy Barker" },
    material: { fr: "Débris plastiques marins", en: "Marine plastic debris" },
    context: [
      {
        fr: "La série réunit des déchets ramassés sur plus de trente plages de Hong Kong. Mandy Barker les photographie avec une précision presque scientifique, tout en gardant une force visuelle très esthétique.",
        en: "The series brings together waste collected from more than thirty beaches in Hong Kong. Mandy Barker photographs it with near-scientific precision while keeping a strong aesthetic appeal.",
      },
      {
        fr: "Le titre renvoie au volume colossal de plastiques qui part vers les décharges chaque jour à Hong Kong et transforme l'image en alerte documentaire.",
        en: "The title points to the huge amount of plastic sent to landfills every day in Hong Kong and turns the image into a documentary warning.",
      },
    ],
    interest: {
      fr: "Très utile pour CleanMyMap: elle montre qu'une image belle peut aussi être un outil de vigilance sur la pollution plastique.",
      en: "Very useful for CleanMyMap: it shows that a beautiful image can also be a tool for vigilance about plastic pollution.",
    },
    image: {
      src: "https://media.wired.com/photos/59549d615578bd7594c467c6/3%3A2/w_2560%2Cc_limit/mandy_barker_lighter_wired.jpg",
      alt: {
        fr: "Image de la série Hong Kong Soup: 1826 de Mandy Barker",
        en: "Image from Mandy Barker's Hong Kong Soup: 1826 series",
      },
      caption: {
        fr: "Image publiée dans Wired.",
        en: "Image published in Wired.",
      },
    },
    source: {
      href: "https://www.wired.com/2015/07/mandy-barker-photos-plastic-pollution/",
      label: { fr: "Source", en: "Source" },
    },
  },
  {
    key: "washed-ashore-project",
    title: { fr: "Washed Ashore Project", en: "Washed Ashore Project" },
    artist: { fr: "Angela Haseltine Pozzi et collectif", en: "Angela Haseltine Pozzi and collaborators" },
    material: { fr: "Plastiques marins ramassés", en: "Collected marine plastics" },
    context: [
      {
        fr: "Le projet fabrique de grandes sculptures d'animaux marins à partir de déchets récupérés sur les plages. Les pièces sont souvent construites avec l'aide de bénévoles et servent de support pédagogique dans les aquariums et musées.",
        en: "The project creates large marine-animal sculptures from waste collected on beaches. The pieces are often built with volunteers and used as educational support in aquariums and museums.",
      },
      {
        fr: "On lit tout de suite la forme de l'animal, puis l'image révèle la masse de plastique qui le compose. Cette bascule entre beauté et alerte fonctionne très bien pour la sensibilisation.",
        en: "You read the animal form immediately, then the image reveals the mass of plastic that makes it up. This shift between beauty and warning works very well for awareness.",
      },
    ],
    interest: {
      fr: "Utile pour CleanMyMap parce que le déchet devient à la fois symbole, pédagogie et preuve matérielle de la pollution marine.",
      en: "Useful for CleanMyMap because waste becomes symbol, education, and material proof of marine pollution.",
    },
    image: {
      src: "https://upload.wikimedia.org/wikipedia/commons/1/12/Washed_Ashore_Polier_%281%29.jpg",
      alt: {
        fr: "Sculpture du Washed Ashore Project composée de plastiques marins",
        en: "Washed Ashore Project sculpture made from marine plastics",
      },
      caption: {
        fr: "Photo publiée sur Wikimedia Commons.",
        en: "Photo published on Wikimedia Commons.",
      },
    },
    source: {
      href: "https://washedashore.org/",
      label: { fr: "Source", en: "Source" },
    },
  },
  {
    key: "moffat-takadiwa",
    title: { fr: "Sculptures murales en fragments plastiques", en: "Wall sculptures from plastic fragments" },
    artist: { fr: "Moffat Takadiwa", en: "Moffat Takadiwa" },
    material: { fr: "Claviers, brosses, bouchons, peignes", en: "Keyboards, brushes, caps, combs" },
    context: [
      {
        fr: "Moffat Takadiwa construit des assemblages denses à partir de milliers de petits objets du quotidien récupérés. Les surfaces obtenues ressemblent à des tapisseries, mais elles sont faites de rebuts domestiques et industriels.",
        en: "Moffat Takadiwa builds dense assemblages from thousands of small recovered everyday objects. The resulting surfaces look like tapestries, but they are made of domestic and industrial leftovers.",
      },
      {
        fr: "Sous l'effet visuel très séduisant, l'oeuvre parle aussi de consommation, d'histoire coloniale et de paysages abîmés par les déchets.",
        en: "Under the seductively rich surface, the work also speaks about consumption, colonial history, and landscapes damaged by waste.",
      },
    ],
    interest: {
      fr: "Cette pièce rappelle à CleanMyMap qu'un petit fragment peut devenir un motif monumental, donc une matière de narration à part entière.",
      en: "This piece reminds CleanMyMap that a small fragment can become a monumental pattern and therefore a narrative material in its own right.",
    },
    image: {
      src: "https://i0.wp.com/sculpturemagazine.art/wp-content/uploads/2022/01/2-MT-Object-of-Influence-5A.jpg?fit=2500%2C2000&ssl=1",
      alt: {
        fr: "Object of Influence (5A) de Moffat Takadiwa",
        en: "Object of Influence (5A) by Moffat Takadiwa",
      },
      caption: {
        fr: "Photo publiée dans Sculpture Magazine.",
        en: "Photo published in Sculpture Magazine.",
      },
    },
    source: {
      href: "https://sculpturemagazine.art/moffat-takadiwa/",
      label: { fr: "Source", en: "Source" },
    },
  },
];

export const RESOURCE_SORTING_CUES: SortingCue[] = [
  {
    icon: Recycle,
    tone: "emerald",
    title: { fr: "Mégots", en: "Butts" },
    text: {
      fr: "À part, dans un contenant fermé et au sec.",
      en: "Keep separate, sealed, and dry.",
    },
  },
  {
    icon: BookOpen,
    tone: "cyan",
    title: { fr: "Verre / métal", en: "Glass / metal" },
    text: {
      fr: "Sacs distincts pour éviter la contamination croisée.",
      en: "Use separate bags to avoid cross-contamination.",
    },
  },
  {
    icon: Leaf,
    tone: "emerald",
    title: { fr: "Plastique", en: "Plastic" },
    text: {
      fr: "Regrouper les matières séparables, sans mélanger le mixte.",
      en: "Group separable materials and keep mixed waste apart.",
    },
  },
  {
    icon: TriangleAlert,
    tone: "amber",
    title: { fr: "Mixte", en: "Mixed" },
    text: {
      fr: "Isoler le non triable et noter la raison terrain.",
      en: "Isolate non-sortable waste and note why on site.",
    },
  },
];

export const RESOURCE_SORTING_TONE_CLASSES = {
  amber: "text-amber-700",
  cyan: "text-orange-700",
  emerald: "text-amber-700",
} as const;
