"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChevronDown,
  BookOpen,
  CalendarDays,
  Leaf,
  Palette,
  Recycle,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, type Locale } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { LearnRubricShell } from "@/components/learn/learn-rubric-shell";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";
import { LEARN_RESOURCE_EVENTS } from "@/lib/learning/learn-rubric-data";
import { recordLearnPageVisit } from "@/lib/learning/learn-progress";

const locales = { fr, en: enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

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
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
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

export function LearnArtworkAccordion({ locale }: { locale: LearnLocale }) {
  return (
    <section className="rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Références artistiques" : "Art references"}
          </p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {locale === "fr" ? "Déplier une oeuvre à la fois" : "Open one work at a time"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            {locale === "fr"
              ? "Clique sur le titre pour ouvrir la fiche. Chaque entrée donne le contexte, le matériau utilisé et une image de l'oeuvre."
              : "Click the title to open the fiche. Each entry gives context, the material used, and an image of the work."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
          <Palette className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {ARTWORK_REFERENCES.map((artwork, index) => (
          <details
            key={artwork.key}
            className="group overflow-hidden rounded-[1.7rem] border border-amber-100 bg-white shadow-sm transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 outline-none transition hover:bg-amber-50/60 md:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900 md:text-xl">
                  {artwork.title[locale]}
                </h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {artwork.artist[locale]} · {artwork.material[locale]}
                </p>
              </div>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 transition duration-150 group-open:rotate-180">
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </span>
            </summary>

            <div className="border-t border-amber-100 px-4 pb-4 pt-4 md:px-5 md:pb-5">
              <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                <figure className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-50">
                  <img
                    src={artwork.image.src}
                    alt={artwork.image.alt[locale]}
                    className="h-64 w-full object-cover md:h-[22rem]"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="border-t border-slate-200 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
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

                  <div className="rounded-[1.35rem] border border-amber-100 bg-amber-50/80 p-3.5">
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
    </section>
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
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {dayLabel}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">{title}</p>
        </div>
        <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
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
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
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
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
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

  useEffect(() => {
    recordLearnPageVisit("ressources");
  }, []);

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
      backHref="/learn/hub"
      backLabel={{ fr: "Retour au point de départ", en: "Back to start" }}
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
    <div className="space-y-6">
      <LearnRessourcesOverview locale={locale} />
      <LearnArtworkAccordion locale={locale} />

      <section id="calendrier" className="grid gap-4 lg:grid-cols-[0.98fr_1.02fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {isFrench ? "Calendrier léger" : "Light calendar"}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {isFrench ? "Un support, pas le centre de gravité" : "Supportive, not the center of gravity"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {isFrench
                    ? "Le mois courant reste lisible, mais les trois blocs du haut donnent l'entrée principale."
                    : "The current month stays readable, but the three blocks above remain the main entry."}
                </p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-900">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {isFrench ? "Événements" : "Events"}
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {LEARN_RESOURCE_EVENTS.length}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {isFrench ? "Repères" : "Cues"}
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-amber-800">4</p>
              </div>
              <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {isFrench ? "Support" : "Support"}
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-amber-800">1</p>
              </div>
            </div>

            <div className="mt-4 h-[420px] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-3">
              <Calendar
                localizer={localizer}
                events={LEARN_RESOURCE_EVENTS}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                culture={locale}
                defaultView="month"
                views={["month"]}
                toolbar={false}
              />
            </div>
          </article>

          <article className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
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
                        <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:inline-flex">
                          {String(cue.title.fr.length).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {isFrench ? "Actions rapides" : "Quick actions"}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/sections/recycling"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:bg-slate-800"
                >
                  {isFrench ? "Ouvrir l'assistant tri" : "Open the sorting assistant"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/sections/compost"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-200 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:from-amber-600 hover:to-orange-600"
                >
                  {isFrench ? "Ouvrir le guide compost" : "Open the compost guide"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {isFrench
                  ? "Les deux destinations restent identiques. La page ne fait que mieux les présenter."
                  : "Both destinations stay identical. The page only presents them more clearly."}
              </p>
            </div>
          </article>
        </section>
      </div>
    </LearnRubricShell>
  );
}
