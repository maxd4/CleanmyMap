import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ChevronRight } from "lucide-react";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import {
  getNavigationSpacesForProfile,
  type NavigationItem,
  type NavigationBlockId,
} from "@/lib/navigation";
import { getProfileLabel, toProfile } from "@/lib/profiles";
import { getServerDisplayModePreference, getServerLocale } from "@/lib/server-preferences";

export const metadata: Metadata = {
  title: "Explorer CleanMyMap - Plan du site et navigation",
  description: "Explorez toutes les sections de CleanMyMap : carte interactive, actions de nettoyage, signalements de pollution, communauté de bénévoles écologistes.",
  robots: { index: true, follow: true },
};

const BLOCK_PREVIEW_PRIORITY: Record<NavigationBlockId, Partial<Record<NavigationItem["id"], number>>> = {
  home:      { dashboard: 1, explorer: 2, profile: 3 },
  act:       { new: 1, route: 2, "trash-spotter": 3 },
  visualize: { map: 1, sandbox: 2, weather: 3 },
  impact:    { reports: 1, gamification: 2 },
  network:   { network: 1, annuaire: 2, community: 3, "open-data": 5 },
  connect:   { messagerie: 1, dm: 2 },
  learn:     { hub: 1, guide: 2, climate: 3, recycling: 4 },
  pilot:     { admin: 1, sponsor: 2, elus: 3, godmode: 4 },
};

function getOrderedPreviewItems(blockId: NavigationBlockId, items: NavigationItem[]): NavigationItem[] {
  const p = BLOCK_PREVIEW_PRIORITY[blockId];
  return [...items].sort((a, b) => {
    const pa = p[a.id] ?? 99, pb = p[b.id] ?? 99;
    return pa !== pb ? pa - pb : a.label.fr.localeCompare(b.label.fr, "fr");
  });
}

// Charte couleur officielle — même esprit que les sept piliers
const BLOCK_THEME: Record<NavigationBlockId, {
  gradient: string;   // bg-gradient-to-br
  ring: string;       // ring-1
  iconBg: string;     // fond icône
  iconColor: string;  // couleur icône + texte accent
  dot: string;        // pastille coin
  itemHover: string;  // hover rubriques
  ctaColor: string;   // couleur texte CTA
  divider: string;    // séparateur
}> = {
  home: {
    gradient:  "from-amber-400/30 to-amber-300/10",
    ring:      "ring-amber-400/30",
    iconBg:    "bg-amber-400/20",
    iconColor: "text-amber-700",
    dot:       "bg-amber-500",
    itemHover: "hover:bg-amber-400/15 hover:text-amber-900",
    ctaColor:  "text-amber-700",
    divider:   "bg-amber-300/30",
  },
  act: {
    gradient:  "from-emerald-400/30 to-emerald-300/10",
    ring:      "ring-emerald-400/30",
    iconBg:    "bg-emerald-400/20",
    iconColor: "text-emerald-700",
    dot:       "bg-emerald-500",
    itemHover: "hover:bg-emerald-400/15 hover:text-emerald-900",
    ctaColor:  "text-emerald-700",
    divider:   "bg-emerald-300/30",
  },
  visualize: {
    gradient:  "from-sky-400/30 to-sky-300/10",
    ring:      "ring-sky-400/30",
    iconBg:    "bg-sky-400/20",
    iconColor: "text-sky-700",
    dot:       "bg-sky-500",
    itemHover: "hover:bg-sky-400/15 hover:text-sky-900",
    ctaColor:  "text-sky-700",
    divider:   "bg-sky-300/30",
  },
  impact: {
    gradient:  "from-rose-400/30 to-rose-300/10",
    ring:      "ring-rose-400/30",
    iconBg:    "bg-rose-400/20",
    iconColor: "text-rose-700",
    dot:       "bg-rose-500",
    itemHover: "hover:bg-rose-400/15 hover:text-rose-900",
    ctaColor:  "text-rose-700",
    divider:   "bg-rose-300/30",
  },
  network: {
    gradient:  "from-indigo-400/30 to-indigo-300/10",
    ring:      "ring-indigo-400/30",
    iconBg:    "bg-indigo-400/20",
    iconColor: "text-indigo-700",
    dot:       "bg-indigo-500",
    itemHover: "hover:bg-indigo-400/15 hover:text-indigo-900",
    ctaColor:  "text-indigo-700",
    divider:   "bg-indigo-300/30",
  },
  connect: {
    gradient:  "from-pink-400/30 to-pink-300/10",
    ring:      "ring-pink-400/30",
    iconBg:    "bg-pink-400/20",
    iconColor: "text-pink-700",
    dot:       "bg-pink-500",
    itemHover: "hover:bg-pink-400/15 hover:text-pink-900",
    ctaColor:  "text-pink-700",
    divider:   "bg-pink-300/30",
  },
  learn: {
    gradient:  "from-yellow-400/30 to-yellow-300/10",
    ring:      "ring-yellow-400/30",
    iconBg:    "bg-yellow-400/20",
    iconColor: "text-yellow-700",
    dot:       "bg-yellow-500",
    itemHover: "hover:bg-yellow-400/15 hover:text-yellow-900",
    ctaColor:  "text-yellow-700",
    divider:   "bg-yellow-300/30",
  },
  pilot: {
    gradient:  "from-amber-600/30 to-amber-500/10",
    ring:      "ring-amber-600/30",
    iconBg:    "bg-amber-600/20",
    iconColor: "text-amber-800",
    dot:       "bg-amber-700",
    itemHover: "hover:bg-amber-600/15 hover:text-amber-900",
    ctaColor:  "text-amber-800",
    divider:   "bg-amber-400/30",
  },
};

export default async function ExplorerPage() {
  const [locale, displayModePreference, role] = await Promise.all([
    getServerLocale(),
    getServerDisplayModePreference(),
    getCurrentUserRoleLabel(),
  ]);
  const currentProfile = toProfile(role);
  const profileLabel = getProfileLabel(currentProfile, locale);
  const spaces = getNavigationSpacesForProfile(currentProfile, displayModePreference.displayMode, locale);
  const visibleSpaces = spaces.map((space) => ({
    ...space,
    items: space.items.filter((item) => item.routeId !== "explorer"),
  }));
  const totalItems = visibleSpaces.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div
      className="relative min-h-screen overflow-hidden font-sans"
      style={{ background: "#92400e" }}
    >
      {/* Fond multicouche orange soleil */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 160% 100% at 50% -15%, #fef08a 0%, #fbbf24 20%, #f97316 50%, #ea580c 75%, #92400e 100%)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(254,240,138,0.6) 0%, transparent 65%)" }} />
      <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full blur-[120px]" style={{ background: "rgba(251,191,36,0.5)" }} />
      <div className="pointer-events-none absolute top-1/2 -right-32 h-[450px] w-[450px] rounded-full blur-[100px]" style={{ background: "rgba(249,115,22,0.25)" }} />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full blur-[120px]" style={{ background: "rgba(253,224,71,0.2)" }} />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-20 pt-8 sm:px-8 sm:pt-10">

        {/* ── Header ── */}
        <div className="mb-12 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
            {locale === "fr" ? "Navigation utilitaire" : "Utility navigation"}
          </p>
          <h1 className="text-[clamp(3rem,6vw,5.5rem)] font-black leading-[0.92] tracking-[-0.05em] text-white">
            {locale === "fr" ? "Explorer" : "Explore"}
          </h1>
          <p className="max-w-xl text-base font-medium text-white/75 leading-relaxed">
            {locale === "fr"
              ? "Accédez à toutes les rubriques disponibles pour votre profil."
              : "Access all sections available for your profile."}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-bold text-white">
              {visibleSpaces.length} {locale === "fr" ? "blocs" : "blocks"}
            </span>
            <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-bold text-white">
              {totalItems} {locale === "fr" ? "rubriques" : "pages"}
            </span>
            <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-bold text-white">
              {profileLabel}
            </span>
          </div>
        </div>

        {/* ── Grille de cartes hub — inspirée des sept piliers ── */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleSpaces.map((space) => {
            const orderedItems = getOrderedPreviewItems(space.id, space.items);
            const firstHref = orderedItems[0]?.href ?? "/dashboard";
            const t = BLOCK_THEME[space.id];

            return (
              <div
                key={space.id}
                className={`group relative flex min-h-[260px] flex-col overflow-hidden rounded-[1.25rem] bg-gradient-to-br ${t.gradient} ring-1 ${t.ring} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_-16px_rgba(0,0,0,0.35)] active:translate-y-0`}
              >
                {/* Dot coin — identique aux piliers */}
                <span className={`absolute right-5 top-5 h-2 w-2 rounded-full ${t.dot} opacity-60 transition-opacity group-hover:opacity-100`} />

                {/* Icône + titre — même structure que les piliers */}
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-[0.9rem] text-xl shadow-lg transition-transform duration-300 group-hover:scale-110 ${t.iconBg}`}>
                  {space.icon}
                </div>

                <h2 className="mb-1 text-[17px] font-black leading-tight text-slate-900">
                  {space.label[locale]}
                </h2>

                {/* Séparateur coloré */}
                <div className={`mb-3 h-px w-8 rounded-full ${t.divider}`} />

                {/* Rubriques — liste cliquable compacte */}
                <div className="flex-1">
                  {orderedItems.length > 0 ? (
                    <ul className="space-y-0.5">
                      {orderedItems.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            className={`group/item flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-slate-700 transition-all duration-150 ${t.itemHover}`}
                          >
                            <span className={`h-1 w-1 shrink-0 rounded-full opacity-50 ${t.dot}`} />
                            <span className="flex-1 leading-snug">{item.label[locale]}</span>
                            <ChevronRight
                              size={11}
                              className={`shrink-0 opacity-0 transition-all group-hover/item:opacity-70 group-hover/item:translate-x-0.5 ${t.iconColor}`}
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12px] text-slate-500">
                      {locale === "fr" ? "Aucune rubrique accessible." : "No pages available."}
                    </p>
                  )}
                </div>

                {/* CTA — même style que les piliers */}
                <div className={`mt-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] ${t.iconColor} opacity-80 transition-opacity group-hover:opacity-100`}>
                  <Link href={firstHref} className="flex items-center gap-2">
                    {locale === "fr" ? "Accéder" : "Open"}
                    <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
