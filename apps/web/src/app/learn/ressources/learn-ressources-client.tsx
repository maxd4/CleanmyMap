"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BellOff,
  ChevronDown,
  BookOpen,
  CalendarDays,
  Clock3,
  CloudOff,
  Download,
  Inbox,
  Leaf,
  Palette,
  Recycle,
  RefreshCcw,
  Sparkles,
  TriangleAlert,
  Trash2,
  KeyRound,
  BookmarkCheck,
  Paperclip,
  UserX,
} from "lucide-react";
import { format, type Locale } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { LearnBlockJourneySection } from "@/components/learn/learn-block-journey-section";
import { LearnPageVisitTracker } from "@/components/learn/learn-page-visit-tracker";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";
import { LEARN_RESOURCE_EVENTS } from "@/lib/learning/learn-rubric-data";

const DeferredLearnRessourcesCalendar = dynamic(
  () => import("./learn-ressources-calendar").then((module) => module.LearnRessourcesCalendar),
  {
    ssr: false,
    loading: () => <div className="h-[420px] rounded-[1.6rem] border border-slate-200 bg-slate-50/80" aria-hidden="true" />,
  },
);

type LearnLocale = "fr" | "en";
type LearnText = { fr: string; en: string };

type ResourceTone = "amber" | "cyan" | "emerald";

type ResourceSpotlight = {
  key: string;
  icon: LucideIcon;
  tone: ResourceTone;
  title: { fr: string; en: string };
  lead: { fr: string; en: string };
  items: { fr: string; en: string }[];
  action?: {
    href: string;
    label: { fr: string; en: string };
  };
};

type ArtworkReference = {
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

type ResourceShortcut = {
  href: string;
  eyebrow: { fr: string; en: string };
  title: { fr: string; en: string };
  detail: { fr: string; en: string };
  label: { fr: string; en: string };
};

type MailboxCleanupStep = {
  icon: LucideIcon;
  title: { fr: string; en: string };
  detail: { fr: string; en: string };
};

type BrowserHistoryCleanupStep = {
  icon: LucideIcon;
  title: { fr: string; en: string };
  detail: { fr: string; en: string };
};

type DigitalMaintenanceTopic = {
  icon: LucideIcon;
  title: { fr: string; en: string };
  detail: { fr: string; en: string };
  cadence: { fr: string; en: string };
};

const RESOURCE_SPOTLIGHTS: ResourceSpotlight[] = [
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

const MAILBOX_CLEANUP_STEPS: MailboxCleanupStep[] = [
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

const BROWSER_HISTORY_CLEANUP_STEPS: BrowserHistoryCleanupStep[] = [
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

const DIGITAL_MAINTENANCE_TOPICS: DigitalMaintenanceTopic[] = [
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

const ARTWORK_REFERENCES: ArtworkReference[] = [
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
      href: "https://www.wired.com/2015/07/mandy-barker-hong-kong-soup-1826/",
      label: { fr: "Source", en: "Source" },
    },
  },
  {
    key: "veronika-richterova-pet-art",
    title: { fr: "Sculptures en bouteilles PET", en: "PET bottle sculptures" },
    artist: { fr: "Veronika Richterová", en: "Veronika Richterová" },
    material: { fr: "Bouteilles plastiques découpées / chauffées", en: "Cut and heated plastic bottles" },
    context: [
      {
        fr: "Depuis 2004, Veronika Richterová transforme des bouteilles PET en objets, plantes ou animaux. Elle exploite la déformation à la chaleur pour faire apparaître une nouvelle matière plastique, plus sculpturale qu'utilitaire.",
        en: "Since 2004, Veronika Richterová has transformed PET bottles into objects, plants, or animals. She uses heat deformation to reveal a new plastic material that feels sculptural rather than utilitarian.",
      },
      {
        fr: "Le geste est simple mais très lisible: un déchet banal garde son identité tout en changeant d'échelle, de forme et de statut.",
        en: "The gesture is simple but very legible: an ordinary waste item keeps its identity while changing scale, form, and status.",
      },
    ],
    interest: {
      fr: "C'est presque une démonstration directe de l'idée PET CleanMyMap: bouteille jetée → forme artistique → message public.",
      en: "It is almost a direct demonstration of the CleanMyMap PET idea: discarded bottle → artistic form → public message.",
    },
    image: {
      src: "https://www.veronikarichterova.com/wp-content/uploads/2014/07/RYBY-P1300712-705x427.jpg",
      alt: {
        fr: "Sculptures en bouteilles PET de Veronika Richterová",
        en: "PET bottle sculptures by Veronika Richterová",
      },
      caption: {
        fr: "Photo publiée sur le site de Veronika Richterová.",
        en: "Photo published on Veronika Richterová's site.",
      },
    },
    source: {
      href: "https://www.veronikarichterova.com/en/dilo/pet-art-sculptures/",
      label: { fr: "Source", en: "Source" },
    },
  },
  {
    key: "washed-ashore-project",
    title: { fr: "Washed Ashore Project", en: "Washed Ashore Project" },
    artist: { fr: "Collectif Washed Ashore", en: "Washed Ashore collective" },
    material: { fr: "Plastiques collectés sur les plages", en: "Plastics collected on beaches" },
    context: [
      {
        fr: "Le projet construit de gigantesques animaux marins à partir de plastiques ramassés sur les plages. La taille des sculptures capte d'abord le regard, puis révèle la quantité de débris nécessaire à leur fabrication.",
        en: "The project builds giant marine animals from plastics collected on beaches. The sculptures' scale catches the eye first, then reveals how much debris was needed to make them.",
      },
      {
        fr: "La dimension collective compte autant que l'objet final: nettoyer, trier et reconstruire devient un geste pédagogique visible par tous.",
        en: "The collective dimension matters as much as the final object: cleaning, sorting, and rebuilding becomes a visible educational gesture.",
      },
    ],
    interest: {
      fr: "Idéal pour CleanMyMap parce que l'oeuvre relie dépollution, pédagogie et imaginaire animal sans perdre l'impact visuel.",
      en: "Ideal for CleanMyMap because the work connects cleanup, education, and animal imagery without losing visual impact.",
    },
    image: {
      src: "https://ocean.si.edu/sites/default/files/styles/full_width_large/public/2023-11/Henry_2016.jpeg.webp?itok=nS2IjI9g",
      alt: {
        fr: "Henry the Giant Fish du projet Washed Ashore",
        en: "Henry the Giant Fish from the Washed Ashore project",
      },
      caption: {
        fr: "Photo publiée par Smithsonian Ocean.",
        en: "Photo published by Smithsonian Ocean.",
      },
    },
    source: {
      href: "https://ocean.si.edu/ocean-life/sharks-rays/washed-ashore-beach-trash-ocean-art",
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

const RESOURCE_SHORTCUTS: ResourceShortcut[] = [
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

const RESOURCE_TONE_CLASSES: Record<
  ResourceTone,
  {
    shell: string;
    badge: string;
    accent: string;
    dot: string;
    border: string;
    glow: string;
    chip: string;
  }
> = {
  amber: {
    shell: "bg-[linear-gradient(180deg,rgba(255,248,231,0.98),rgba(255,255,255,0.96))]",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    accent: "text-amber-700",
    dot: "bg-amber-600",
    border: "border-amber-200",
    glow: "from-amber-200/18 via-orange-100/10 to-transparent",
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
};

function formatEventLabel(locale: LearnLocale, event: { start: Date }) {
  const resolvedLocale: Locale = locale === "fr" ? fr : enUS;
  return `${format(event.start, "d MMM", { locale: resolvedLocale })} · ${format(
    event.start,
    "HH:mm",
    { locale: resolvedLocale },
  )}`;
}

function ResourceSpotlightCard({
  locale,
  spotlight,
  index,
}: {
  locale: LearnLocale;
  spotlight: ResourceSpotlight;
  index: number;
}) {
  const Icon = spotlight.icon;
  const tone = RESOURCE_TONE_CLASSES[spotlight.tone];

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[1.85rem] border bg-white p-4 shadow-sm transition duration-150 ease-out hover:-translate-y-1 hover:shadow-md",
        tone.border,
      )}
    >
      <div className={cn("absolute inset-0 -z-10 bg-gradient-to-br", tone.glow)} aria-hidden="true" />

      <div className="flex items-start justify-between gap-3">
        <div className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl border", tone.badge)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
          {String(index).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-xl font-black tracking-tight text-slate-900">
          {spotlight.title[locale]}
        </h3>
        <p className="text-sm leading-relaxed text-slate-600">
          {spotlight.lead[locale]}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {spotlight.items.map((item) => (
          <div
            key={`${spotlight.key}-${item[locale]}`}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.14em]",
              tone.chip,
            )}
          >
            <span className="min-w-0 text-left">{item[locale]}</span>
            <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} />
          </div>
        ))}
      </div>

      {spotlight.action ? (
        <Link
          href={spotlight.action.href}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-slate-50"
        >
          {spotlight.action.label[locale]}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </article>
  );
}

export function LearnArtworkAccordion({
  locale,
  defaultOpen = false,
}: {
  locale: LearnLocale;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-4 rounded-[1.35rem] px-3 py-2 outline-none transition hover:bg-slate-50/70 focus-visible:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:min-h-14">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Culture visuelle" : "Visual culture"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Références artistiques à ouvrir si besoin" : "Art references to open when needed"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Les fiches restent fermées au départ pour alléger le chargement. Ouvre la section pour voir une référence à la fois."
              : "The fiches stay closed at first to lighten loading. Open the section to view one reference at a time."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {ARTWORK_REFERENCES.length}
          </span>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
            <Palette className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      </summary>

      <div className="mt-5">
        {isOpen ? (
          <div className="space-y-4">
            {ARTWORK_REFERENCES.map((artwork, index) => (
              <details
                key={artwork.key}
                className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50 shadow-sm"
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 outline-none transition hover:bg-slate-100/70 focus-visible:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:min-h-14 md:px-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900 md:text-xl">
                      {artwork.title[locale]}
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {artwork.artist[locale]} · {artwork.material[locale]}
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition duration-150 group-open:rotate-180">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </span>
                </summary>

                <div className="border-t border-slate-200 px-4 pb-4 pt-4 md:px-5 md:pb-5">
                  <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                    <figure className="relative h-64 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-50 md:h-[22rem]">
                      <Image
                        src={artwork.image.src}
                        alt={artwork.image.alt[locale]}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        unoptimized
                        className="object-cover"
                      />
                      <figcaption className="border-t border-slate-200 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                        {artwork.image.caption[locale]}{" "}
                        <a
                          href={artwork.source.href}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-amber-700 transition hover:text-amber-800 hover:underline"
                        >
                          {artwork.source.label[locale]}
                        </a>
                      </figcaption>
                    </figure>

                    <div className="space-y-3">
                      {artwork.context.map((paragraph) => (
                        <p key={paragraph[locale]} className="text-sm leading-relaxed text-slate-700">
                          {paragraph[locale]}
                        </p>
                      ))}

                      <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                          {locale === "fr" ? "Intérêt pour CleanMyMap" : "Why it matters for CleanMyMap"}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                          {artwork.interest[locale]}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? "Les fiches restent fermées au départ pour alléger le chargement. Ouvre la section pour voir une référence à la fois."
              : "The fiches stay closed at first to lighten loading. Open the section to view one reference at a time."}
          </p>
        )}
      </div>
    </details>
  );
}

function LearnResourceShortcutsSection({ locale }: { locale: LearnLocale }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Raccourcis utiles" : "Useful shortcuts"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Les liens directs vers les rubriques utiles" : "Direct links to the useful rubrics"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Les liens restent groupés au même endroit pour ouvrir vite l'assistant tri, le guide compost ou le contexte."
              : "The links stay grouped in one place so you can open the sorting assistant, compost guide or context quickly."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {RESOURCE_SHORTCUTS.map((shortcut) => (
          <article
            key={shortcut.href}
            className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-amber-300/40"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
              {shortcut.eyebrow[locale]}
            </p>
            <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">{shortcut.title[locale]}</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{shortcut.detail[locale]}</p>
            <Link
              href={shortcut.href}
              className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              {shortcut.label[locale]}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function LearnMailboxCleanupSection({ locale }: { locale: LearnLocale }) {
  return (
    <section id="boite-mail" className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Sobriété numérique" : "Digital sobriety"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Nettoyer sa boîte mail et ses abonnements" : "Clean your mailbox and subscriptions"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "À faire tous les trimestres: ouvre Gmail, va dans « More » puis « Manage subscriptions » (ou le raccourci /sub# si ton interface le propose), désabonne-toi des expéditeurs inutiles, puis vide spam et corbeille."
              : "Do this every quarter: open Gmail, go to More then Manage subscriptions (or the /sub# shortcut if your interface shows it), unsubscribe from useless senders, then empty spam and trash."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <Inbox className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-3">
          {MAILBOX_CLEANUP_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <article key={step.title.fr} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-sm">
                    <StepIcon className="h-5 w-5 text-amber-700" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">{step.title[locale]}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{step.detail[locale]}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Impact environnemental estimé" : "Estimated environmental impact"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "L'impact direct d'un nettoyage ponctuel reste faible, mais il devient utile quand il est répété tous les trimestres. Le gain vient surtout de la baisse des emails stockés et des synchronisations inutiles, avec un effet cumulé plus net si tu coupes plusieurs newsletters récurrentes."
              : "The direct impact of one cleanup stays low, but it becomes useful when repeated every quarter. The gain mainly comes from fewer stored emails and fewer unnecessary syncs, with a clearer cumulative effect if you cut several recurring newsletters."}
          </p>
          <div className="mt-3 rounded-[1.2rem] border border-amber-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Repère pratique" : "Practical reference"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {locale === "fr"
                ? "L'ADEME recommande de supprimer les spams, nettoyer les listes de diffusion et se désabonner des newsletters jamais lues."
                : "ADEME recommends deleting spam, cleaning mailing lists, and unsubscribing from newsletters you never read."}
            </p>
            <a
              href="https://support.google.com/mail/answer/15621070?co=GENIE.Platform%3DDesktop&hl=fr"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200 bg-amber-100 px-4 py-2 text-sm font-black text-amber-900 transition hover:-translate-y-[1px] hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
            >
              {locale === "fr" ? "Aide Gmail" : "Gmail help"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}

function LearnBrowserHistoryCleanupSection({ locale }: { locale: LearnLocale }) {
  return (
    <section
      id="historique-navigateur"
      className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Hygiène de navigation" : "Browsing hygiene"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr"
              ? "Vider l'historique du navigateur sur « toute durée »"
              : "Clear browser history on \"all time\""}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Le bon réflexe consiste à nettoyer l'historique sans tout cocher. Garde les mots de passe enregistrés et les paramètres de site uniquement si tu veux les réinitialiser volontairement."
              : "The right reflex is to clean history without selecting everything. Keep saved passwords and site settings only if you intentionally want to reset them."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <Clock3 className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-3">
          {BROWSER_HISTORY_CLEANUP_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <article key={step.title.fr} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-sm">
                    <StepIcon className="h-5 w-5 text-amber-700" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">{step.title[locale]}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{step.detail[locale]}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Impact écologique et rythme" : "Environmental impact and cadence"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "L'impact direct d'un nettoyage d'historique est très faible. Le vrai bénéfice est modeste mais réel quand il évite d'accumuler des données locales et de forcer des synchronisations inutiles. La cadence optimale est tous les trimestres sur un poste personnel, et après chaque usage sur un appareil partagé ou public."
              : "The direct impact of clearing history is very small. The real benefit is modest but real when it prevents local data buildup and unnecessary syncs. The optimal cadence is every quarter on a personal device, and after each use on a shared or public computer."}
          </p>
          <div className="mt-3 rounded-[1.2rem] border border-amber-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "À éviter par défaut" : "Avoid by default"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {locale === "fr"
                ? "Ne coche pas tous les éléments: laisse les mots de passe enregistrés et les paramètres de site décochés, sauf si tu fais un dépannage précis ou un nettoyage complet sur un appareil partagé."
                : "Do not select every item: leave saved passwords and site settings unchecked unless you are doing precise troubleshooting or a full cleanup on a shared device."}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function LearnDigitalMaintenanceSection({ locale }: { locale: LearnLocale }) {
  return (
    <section
      id="entretien-numerique"
      className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Entretien numérique" : "Digital maintenance"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Les petits gestes qui évitent l'encombrement" : "Small gestures that prevent clutter"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Ces gestes complètent le ménage de la boîte mail et du navigateur: ils réduisent les fichiers stockés, les synchronisations inutiles et l'attention gaspillée."
              : "These gestures complement mailbox and browser cleanup: they reduce stored files, unnecessary syncs, and wasted attention."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <CloudOff className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DIGITAL_MAINTENANCE_TOPICS.map((topic) => {
          const TopicIcon = topic.icon;
          return (
            <article key={topic.title.fr} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-sm">
                  <TopicIcon className="h-5 w-5 text-amber-700" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                    {topic.cadence[locale]}
                  </p>
                  <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">{topic.title[locale]}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{topic.detail[locale]}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <aside className="mt-4 rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
          {locale === "fr" ? "Impact écologique et cadence" : "Environmental impact and cadence"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {locale === "fr"
            ? "L'impact d'un seul geste reste faible à moyen selon le volume de données concerné. L'effet devient plus visible quand tu combines un nettoyage trimestriel des gros volumes avec un entretien mensuel des téléchargements, favoris et notifications. La cadence optimale est donc hybride: mensuel pour le bruit du quotidien, trimestriel pour les gros stocks, semestriel pour les comptes et la synchro."
            : "The impact of a single gesture stays low to medium depending on the data volume involved. The effect becomes more visible when you combine quarterly cleanup of large volumes with monthly maintenance of downloads, bookmarks, and notifications. The optimal cadence is therefore hybrid: monthly for daily noise, quarterly for large storage, and twice-yearly for accounts and sync."}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {locale === "fr"
            ? "Pour les pièces jointes, les doublons et les corbeilles cloud, l'ordre de priorité est: supprimer ce qui n'a plus d'usage, puis vider la corbeille associée."
            : "For attachments, duplicates, and cloud trash, the priority is: delete what is no longer useful, then empty the associated trash."}
        </p>
      </aside>
    </section>
  );
}

function LearnRessourcesCalendarPanel({ locale }: { locale: LearnLocale }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-4 rounded-[1.35rem] px-3 py-2 outline-none transition hover:bg-slate-50/70 focus-visible:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/70 md:min-h-14">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Calendrier léger" : "Light calendar"}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Ouvrir le calendrier si besoin" : "Open the calendar when needed"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
            {locale === "fr"
              ? "Le calendrier se charge à la demande. Les trois blocs du haut suffisent pour l'entrée rapide."
              : "The calendar loads on demand. The three blocks above are enough for the quick entry."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
      </summary>

      <div className="mt-4">
        {isOpen ? (
          <DeferredLearnRessourcesCalendar locale={locale} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                {locale === "fr" ? "Charge" : "Load"}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {locale === "fr" ? "À la demande" : "On demand"}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                {locale === "fr" ? "Usage" : "Usage"}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {locale === "fr" ? "Support secondaire" : "Secondary support"}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                {locale === "fr" ? "Accès" : "Access"}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {locale === "fr" ? "Une ouverture manuelle" : "Manual opening"}
              </p>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function EventRow({
  locale,
  title,
  start,
  end,
}: {
  locale: LearnLocale;
  title: string;
  start: Date;
  end: Date;
}) {
  const resolvedLocale: Locale = locale === "fr" ? fr : enUS;
  const dayLabel = format(start, "EEE d MMM", { locale: resolvedLocale });
  const timeLabel = `${format(start, "HH:mm", { locale: resolvedLocale })} - ${format(
    end,
    "HH:mm",
    { locale: resolvedLocale },
  )}`;

  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {dayLabel}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">{title}</p>
        </div>
        <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm">
          {timeLabel}
        </span>
      </div>
    </div>
  );
}

export function LearnRessourcesOverview({ locale }: { locale: LearnLocale }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="grid gap-4 md:grid-cols-3">
        {RESOURCE_SPOTLIGHTS.map((spotlight, index) => (
          <ResourceSpotlightCard key={spotlight.key} locale={locale} spotlight={spotlight} index={index + 1} />
        ))}
      </div>

      <aside className="rounded-[1.85rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
              {locale === "fr" ? "Aperçu immédiat" : "Immediate overview"}
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {locale === "fr" ? "Deux rendez-vous visibles" : "Two visible meetups"}
            </h3>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {LEARN_RESOURCE_EVENTS.map((event) => (
            <EventRow
              key={event.title}
              locale={locale}
              title={event.title}
              start={event.start}
              end={event.end}
            />
          ))}
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
            {locale === "fr" ? "Orientation" : "Orientation"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? "Le calendrier reste un support. Les trois blocs du haut servent d'entrée rapide."
              : "The calendar stays supportive. The three blocks above are the quick entry points."}
          </p>
          <Link
            href="#calendrier"
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 transition hover:-translate-y-[1px] hover:bg-slate-50"
          >
            {locale === "fr" ? "Voir le calendrier" : "View the calendar"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </section>
  );
}

export function LearnRessourcesClient() {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";

  const sortingCues = [
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
  ] as const;

  const cueToneClasses = {
    amber: "text-amber-700",
    cyan: "text-orange-700",
    emerald: "text-amber-700",
  } as const;

  return (
    <LearnRubricShell
      title={{ fr: "Ressources", en: "Resources" }}
      subtitle={{
        fr: "Kit terrain, repères de tri et événements utiles",
        en: "Field kit, sorting cues and useful events",
      }}
      description={{
        fr: "Trois portes d'entrée visibles d'abord, puis un calendrier plus léger pour garder la page orientée action.",
        en: "Three visible entry points first, then a lighter calendar to keep the page action-oriented.",
      }}
      backHref="/explorer"
      backLabel={{ fr: "Retour au sommaire", en: "Back to summary" }}
      accent="yellow"
      highlights={[
        { fr: "Kit terrain", en: "Field kit" },
        { fr: "Repères de tri", en: "Sorting cues" },
        { fr: "Événements", en: "Events" },
      ]}
      cta={{
        href: "/learn/comprendre",
        label: { fr: "Voir le contexte", en: "See the context" },
      }}
    >
      <LearnPageVisitTracker pageId="bonnes-pratiques" />
      <div className="space-y-6">
        <LearnRessourcesOverview locale={locale} />
        <LearnBlockJourneySection locale={locale} currentPageId="bonnes-pratiques" />

        <LearnResourceShortcutsSection locale={locale} />

        <LearnMailboxCleanupSection locale={locale} />

        <LearnBrowserHistoryCleanupSection locale={locale} />

        <LearnDigitalMaintenanceSection locale={locale} />

        <section id="calendrier">
          <LearnRessourcesCalendarPanel locale={locale} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                {isFrench ? "Repères de tri" : "Sorting cues"}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                {isFrench ? "Les gestes qui reviennent le plus" : "The gestures that come back most often"}
              </h2>
            </div>

            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-slate-600">
                {isFrench
                  ? "Les repères sont réduits à l'essentiel pour tenir en lecture rapide."
                  : "The cues are reduced to the essentials so they stay quick to read."}
              </p>

              <div className="grid gap-3">
                {sortingCues.map((cue) => {
                  const Icon = cue.icon;
                  return (
                    <div
                      key={cue.title.fr}
                      className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-sm">
                            <Icon size={18} className={cueToneClasses[cue.tone]} aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {isFrench ? cue.title.fr : cue.title.en}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                              {isFrench ? cue.text.fr : cue.text.en}
                            </p>
                          </div>
                        </div>
                        <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 sm:inline-flex">
                          {String(cue.title.fr.length).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>

          <div className="space-y-4">
            <LearnArtworkAccordion locale={locale} />
          </div>
        </section>
      </div>
    </LearnRubricShell>
  );
}
