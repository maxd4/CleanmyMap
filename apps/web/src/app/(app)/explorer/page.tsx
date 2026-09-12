import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { getCurrentUserActiveRole } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import {
  getNavigationSpacesForProfile,
  type NavigationItem,
  type NavigationBlockId,
} from "@/lib/navigation";
import { toProfile } from "@/lib/profiles";
import { getServerDisplayModePreference, getServerLocale } from "@/lib/server-preferences";
import { EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";

export const metadata: Metadata = {
  title: "Sommaire CleanMyMap - Plan du site et navigation",
  description: "Explorez toutes les sections de CleanMyMap : carte interactive, actions de nettoyage, signalements de pollution, communauté de bénévoles écologistes.",
  robots: { index: true, follow: true },
};

const BLOCK_PREVIEW_PRIORITY: Record<NavigationBlockId, Partial<Record<NavigationItem["id"], number>>> = {
  home:      { dashboard: 1, explorer: 2, pilotage: 3, admin: 4, sponsor: 5, funding: 6 },
  act:       { new: 1, "rejoindre-un-formulaire": 2, route: 3, "trash-spotter": 4 },
  visualize: { map: 1, methodologie: 2, reports: 3, gamification: 4 },
  impact:    {},
  network:   { network: 1, community: 2, feedback: 3, messagerie: 4, "open-data": 5, annuaire: 6 },
  connect:   { messagerie: 1, dm: 2 },
  learn:     {
    "learn-comprendre": 1,
    "learn-sentrainer": 2,
    "learn-bonnes-pratiques": 3,
  },
};

function getOrderedPreviewItems(blockId: NavigationBlockId, items: NavigationItem[]): NavigationItem[] {
  const p = BLOCK_PREVIEW_PRIORITY[blockId];
  return [...items].sort((a, b) => {
    const pa = p[a.id] ?? 99, pb = p[b.id] ?? 99;
    return pa !== pb ? pa - pb : a.label.fr.localeCompare(b.label.fr, "fr");
  });
}

// Charte couleur officielle — même esprit que les blocs de navigation visibles
const BLOCK_THEME: Record<NavigationBlockId, {
  backgroundImage: string; // inline gradient surface
  ring: string;       // ring-1
  iconBg: string;     // fond icône
  iconColor: string;  // couleur icône + texte accent
  badge: string;      // badge compteur
  border: string;     // bordure carte
  glow: string;       // glow hover
  text: string;       // texte principal
  mutedText: string;  // texte secondaire
  dot: string;        // pastille coin
  itemHover: string;  // hover rubriques
  divider: string;    // séparateur
}> = {
  home: {
    backgroundImage: "linear-gradient(135deg, #431407 0%, #7c2d12 52%, #a16207 100%)",
    ring:      "ring-orange-200/20",
    iconBg:    "bg-orange-500",
    iconColor: "text-white",
    badge:     "border-orange-200/25 bg-orange-100/12 text-white",
    border:    "border-orange-200/18",
    glow:      "group-hover:shadow-orange-950/30",
    text:      "text-white",
    mutedText: "text-white/82",
    dot:       "bg-orange-300",
    itemHover: "hover:border-white/12 hover:bg-white/8 hover:text-white",
    divider:   "bg-orange-200/35",
  },
  act: {
    backgroundImage: "linear-gradient(135deg, #06261c 0%, #0f3b2b 52%, #14532d 100%)",
    ring:      "ring-emerald-200/20",
    iconBg:    "bg-emerald-500",
    iconColor: "text-white",
    badge:     "border-emerald-200/25 bg-emerald-100/12 text-white",
    border:    "border-emerald-200/18",
    glow:      "group-hover:shadow-emerald-950/28",
    text:      "text-white",
    mutedText: "text-white/82",
    dot:       "bg-emerald-300",
    itemHover: "hover:border-white/12 hover:bg-white/8 hover:text-white",
    divider:   "bg-emerald-200/32",
  },
  visualize: {
    backgroundImage: "linear-gradient(135deg, #071827 0%, #0c2940 52%, #0f4c6e 100%)",
    ring:      "ring-sky-200/20",
    iconBg:    "bg-sky-500",
    iconColor: "text-white",
    badge:     "border-sky-200/25 bg-sky-100/12 text-white",
    border:    "border-sky-200/18",
    glow:      "group-hover:shadow-sky-950/28",
    text:      "text-white",
    mutedText: "text-white/82",
    dot:       "bg-sky-300",
    itemHover: "hover:border-white/12 hover:bg-white/8 hover:text-white",
    divider:   "bg-sky-200/32",
  },
  impact: {
    backgroundImage: "linear-gradient(135deg, #2a0006 0%, #521111 52%, #dc2626 100%)",
    ring:      "ring-red-200/20",
    iconBg:    "bg-red-500",
    iconColor: "text-white",
    badge:     "border-red-200/25 bg-red-100/12 text-white",
    border:    "border-red-200/18",
    glow:      "group-hover:shadow-red-950/28",
    text:      "text-white",
    mutedText: "text-white/82",
    dot:       "bg-red-300",
    itemHover: "hover:border-white/12 hover:bg-white/8 hover:text-white",
    divider:   "bg-red-200/32",
  },
  network: {
    backgroundImage: "linear-gradient(135deg, #04020f 0%, #120824 52%, #312e81 100%)",
    ring:      "ring-indigo-200/20",
    iconBg:    "bg-indigo-500",
    iconColor: "text-white",
    badge:     "border-indigo-200/25 bg-indigo-100/12 text-white",
    border:    "border-indigo-200/18",
    glow:      "group-hover:shadow-indigo-950/28",
    text:      "text-white",
    mutedText: "text-white/82",
    dot:       "bg-indigo-300",
    itemHover: "hover:border-white/12 hover:bg-white/8 hover:text-white",
    divider:   "bg-indigo-200/32",
  },
  connect: {
    backgroundImage: "linear-gradient(135deg, #2a0015 0%, #4a0f2c 52%, #831843 100%)",
    ring:      "ring-pink-200/20",
    iconBg:    "bg-pink-500",
    iconColor: "text-white",
    badge:     "border-pink-200/25 bg-pink-100/12 text-white",
    border:    "border-pink-200/18",
    glow:      "group-hover:shadow-pink-950/28",
    text:      "text-white",
    mutedText: "text-white/82",
    dot:       "bg-pink-300",
    itemHover: "hover:border-white/12 hover:bg-white/8 hover:text-white",
    divider:   "bg-pink-200/32",
  },
  learn: {
    backgroundImage: "linear-gradient(135deg, #241f00 0%, #4a3207 52%, #713f12 100%)",
    ring:      "ring-yellow-200/20",
    iconBg:    "bg-yellow-500",
    iconColor: "text-white",
    badge:     "border-yellow-200/25 bg-yellow-100/12 text-white",
    border:    "border-yellow-200/18",
    glow:      "group-hover:shadow-yellow-950/28",
    text:      "text-white",
    mutedText: "text-white/82",
    dot:       "bg-yellow-300",
    itemHover: "hover:border-white/12 hover:bg-white/8 hover:text-white",
    divider:   "bg-yellow-200/32",
  },
};

function formatBlockLabel(label: string): string {
  return label.replaceAll(" et ", " & ");
}

export default async function ExplorerPage() {
  const [locale, displayModePreference, session] = await Promise.all([
    getServerLocale(),
    getServerDisplayModePreference(),
    getSafeAuthSession(),
  ]);
  const role = session.state === "authenticated"
    ? await getCurrentUserActiveRole()
    : "anonymous" as const;
  const currentProfile = toProfile(role);
  const spaces = getNavigationSpacesForProfile(currentProfile, displayModePreference.displayMode, locale);
  const visibleSpaces = spaces.map((space) => ({
    ...space,
    items: space.items.filter((item) => item.href !== EXPLORER_ROUTE),
  }));

  return (
    <div
      className="relative min-h-screen overflow-hidden font-sans text-white"
    >
      <div className="relative z-10 mx-auto w-full max-w-[1360px] px-6 pb-16 pt-10 sm:px-10 sm:pb-24 sm:pt-12 lg:px-12">

        {/* ── Header ── */}
        <div className="mb-14 space-y-4">
          <h1 className="text-[clamp(3rem,6vw,5.5rem)] font-black leading-[0.92] tracking-[-0.05em] text-stone-950">
            {locale === "fr" ? "Sommaire" : "Summary"}
          </h1>
          <p className="max-w-xl text-base font-medium leading-relaxed text-black">
            {locale === "fr"
              ? "CleanMyMap en un coup d'œil"
              : "CleanMyMap at a glance"}
          </p>
        </div>

        {/* ── Grille de cartes hub — inspirée des blocs de navigation visibles ── */}
        <div className="mx-auto grid w-full grid-cols-1 items-start justify-center gap-5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] lg:gap-6 xl:items-stretch">
          {visibleSpaces.map((space) => {
            const orderedItems = getOrderedPreviewItems(space.id, space.items);
            const t = BLOCK_THEME[space.id];

            return (
              <article
                key={space.id}
                style={{ backgroundImage: t.backgroundImage }}
                className={`group relative flex min-h-[260px] h-fit w-full flex-col overflow-hidden rounded-[1rem] border ${t.border} p-6 ring-1 ${t.ring} shadow-[0_26px_56px_-30px_rgba(15,23,42,0.38)] transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none lg:hover:-translate-y-0.5 lg:hover:brightness-105 hover:border-opacity-100 hover:shadow-[0_32px_68px_-34px_rgba(15,23,42,0.48)] ${t.glow} active:translate-y-0 sm:p-7 xl:h-full xl:p-4`}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/14 to-transparent" />
                <div className={`pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full ${t.dot} opacity-[0.16]`} />
                {/* Dot coin — identique aux piliers */}
                <span className={`absolute right-5 top-5 h-2 w-2 rounded-full ${t.dot} opacity-75 transition-opacity group-hover:opacity-100`} />

                {/* Icône + titre — même structure que les piliers */}
                <div className={`relative mb-5 flex h-12 w-12 items-center justify-center rounded-[0.9rem] text-xl text-white shadow-lg transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105 ${t.iconBg}`}>
                  {space.icon}
                </div>

                <div className="relative mb-2 flex items-start justify-between gap-3">
                  <h2 className={`min-w-0 break-words text-[21px] font-black leading-tight ${t.text}`}>
                    {formatBlockLabel(space.label[locale])}
                  </h2>
                </div>

                {/* Séparateur coloré */}
                <div className={`relative mb-3 h-1 w-10 rounded-full ${t.divider}`} />

                {/* Rubriques — liste cliquable compacte */}
                <div className="relative flex-1">
                  {orderedItems.length > 0 ? (
                    <ul className="space-y-1.5">
                      {orderedItems.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            className={`group/item flex min-h-9 items-center gap-2 rounded-xl border border-transparent px-2.5 py-1.5 text-[14px] font-semibold ${t.mutedText} transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:ring-2 focus-visible:ring-white/30 ${t.itemHover}`}
                          >
                            <span className={`h-1 w-1 shrink-0 rounded-full opacity-80 ${t.dot}`} />
                            <span className="flex-1 whitespace-nowrap leading-snug">{item.label[locale]}</span>
                            <ChevronRight
                              size={11}
                              className={`shrink-0 opacity-0 transition-all group-hover/item:opacity-80 group-hover/item:translate-x-0.5 ${t.iconColor}`}
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={`text-[12px] ${t.mutedText}`}>
                      {locale === "fr" ? "Aucune rubrique accessible." : "No pages available."}
                    </p>
                  )}
                </div>

              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
