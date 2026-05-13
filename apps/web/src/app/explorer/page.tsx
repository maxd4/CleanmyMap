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
  badge: string;      // badge compteur
  border: string;     // bordure carte
  glow: string;       // glow hover
  cta: string;        // bouton CTA
  dot: string;        // pastille coin
  itemHover: string;  // hover rubriques
  divider: string;    // séparateur
}> = {
  home: {
    gradient:  "from-amber-200/92 via-orange-50/82 to-white/78",
    ring:      "ring-amber-200/65",
    iconBg:    "bg-amber-500/78",
    iconColor: "text-amber-800",
    badge:     "border-amber-300/55 bg-amber-100/75 text-amber-950",
    border:    "border-amber-300/45",
    glow:      "group-hover:shadow-amber-950/18",
    cta:       "border-amber-300/55 bg-amber-500/14 text-amber-950 hover:bg-amber-500/22",
    dot:       "bg-amber-500",
    itemHover: "hover:border-amber-300/45 hover:bg-amber-100/70 hover:text-amber-950",
    divider:   "bg-amber-300/30",
  },
  act: {
    gradient:  "from-emerald-100/88 via-orange-50/70 to-white/78",
    ring:      "ring-emerald-200/60",
    iconBg:    "bg-emerald-500/78",
    iconColor: "text-emerald-700",
    badge:     "border-emerald-300/50 bg-emerald-50/85 text-emerald-950",
    border:    "border-emerald-300/42",
    glow:      "group-hover:shadow-emerald-950/16",
    cta:       "border-emerald-300/52 bg-emerald-500/12 text-emerald-950 hover:bg-emerald-500/20",
    dot:       "bg-emerald-500",
    itemHover: "hover:border-emerald-300/45 hover:bg-emerald-50/85 hover:text-emerald-950",
    divider:   "bg-emerald-300/30",
  },
  visualize: {
    gradient:  "from-sky-100/88 via-orange-50/70 to-white/78",
    ring:      "ring-sky-200/60",
    iconBg:    "bg-sky-500/78",
    iconColor: "text-sky-700",
    badge:     "border-sky-300/50 bg-sky-50/85 text-sky-950",
    border:    "border-sky-300/42",
    glow:      "group-hover:shadow-sky-950/16",
    cta:       "border-sky-300/52 bg-sky-500/12 text-sky-950 hover:bg-sky-500/20",
    dot:       "bg-sky-500",
    itemHover: "hover:border-sky-300/45 hover:bg-sky-50/85 hover:text-sky-950",
    divider:   "bg-sky-300/30",
  },
  impact: {
    gradient:  "from-rose-100/88 via-orange-50/70 to-white/78",
    ring:      "ring-rose-200/60",
    iconBg:    "bg-rose-500/78",
    iconColor: "text-rose-700",
    badge:     "border-rose-300/50 bg-rose-50/85 text-rose-950",
    border:    "border-rose-300/42",
    glow:      "group-hover:shadow-rose-950/16",
    cta:       "border-rose-300/52 bg-rose-500/12 text-rose-950 hover:bg-rose-500/20",
    dot:       "bg-rose-500",
    itemHover: "hover:border-rose-300/45 hover:bg-rose-50/85 hover:text-rose-950",
    divider:   "bg-rose-300/30",
  },
  network: {
    gradient:  "from-indigo-100/88 via-orange-50/70 to-white/78",
    ring:      "ring-indigo-200/60",
    iconBg:    "bg-indigo-500/78",
    iconColor: "text-indigo-700",
    badge:     "border-indigo-300/50 bg-indigo-50/85 text-indigo-950",
    border:    "border-indigo-300/42",
    glow:      "group-hover:shadow-indigo-950/16",
    cta:       "border-indigo-300/52 bg-indigo-500/12 text-indigo-950 hover:bg-indigo-500/20",
    dot:       "bg-indigo-500",
    itemHover: "hover:border-indigo-300/45 hover:bg-indigo-50/85 hover:text-indigo-950",
    divider:   "bg-indigo-300/30",
  },
  connect: {
    gradient:  "from-pink-100/88 via-orange-50/70 to-white/78",
    ring:      "ring-pink-200/60",
    iconBg:    "bg-pink-500/78",
    iconColor: "text-pink-700",
    badge:     "border-pink-300/50 bg-pink-50/85 text-pink-950",
    border:    "border-pink-300/42",
    glow:      "group-hover:shadow-pink-950/16",
    cta:       "border-pink-300/52 bg-pink-500/12 text-pink-950 hover:bg-pink-500/20",
    dot:       "bg-pink-500",
    itemHover: "hover:border-pink-300/45 hover:bg-pink-50/85 hover:text-pink-950",
    divider:   "bg-pink-300/30",
  },
  learn: {
    gradient:  "from-yellow-100/90 via-orange-50/72 to-white/78",
    ring:      "ring-yellow-200/65",
    iconBg:    "bg-yellow-500/78",
    iconColor: "text-yellow-700",
    badge:     "border-yellow-300/55 bg-yellow-50/85 text-yellow-950",
    border:    "border-yellow-300/45",
    glow:      "group-hover:shadow-yellow-950/16",
    cta:       "border-yellow-300/55 bg-yellow-500/14 text-yellow-950 hover:bg-yellow-500/22",
    dot:       "bg-yellow-500",
    itemHover: "hover:border-yellow-300/45 hover:bg-yellow-50/85 hover:text-yellow-950",
    divider:   "bg-yellow-300/30",
  },
  pilot: {
    gradient:  "from-orange-200/90 via-amber-50/78 to-white/78",
    ring:      "ring-orange-300/60",
    iconBg:    "bg-orange-600/78",
    iconColor: "text-amber-800",
    badge:     "border-orange-300/55 bg-orange-50/85 text-orange-950",
    border:    "border-orange-300/45",
    glow:      "group-hover:shadow-orange-950/18",
    cta:       "border-orange-300/55 bg-orange-600/14 text-orange-950 hover:bg-orange-600/22",
    dot:       "bg-amber-700",
    itemHover: "hover:border-orange-300/45 hover:bg-orange-50/85 hover:text-orange-950",
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
          <h1 className="text-[clamp(3rem,6vw,5.5rem)] font-black leading-[0.92] tracking-[-0.05em] text-white">
            {locale === "fr" ? "Explorer" : "Explore"}
          </h1>
          <p className="max-w-xl text-base font-medium text-white/75 leading-relaxed">
            {locale === "fr"
              ? "Accédez à toutes les rubriques disponibles pour votre profil."
              : "Access all sections available for your profile."}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span className="rounded-full border border-white/24 bg-white/14 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
              {visibleSpaces.length} {locale === "fr" ? "blocs" : "blocks"}
            </span>
            <span className="rounded-full border border-white/24 bg-white/14 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
              {totalItems} {locale === "fr" ? "rubriques" : "pages"}
            </span>
            <span className="rounded-full border border-white/24 bg-white/14 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
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
              <article
                key={space.id}
                className={`group relative flex min-h-[286px] flex-col overflow-hidden rounded-[1rem] border ${t.border} bg-gradient-to-br ${t.gradient} p-5 ring-1 ${t.ring} shadow-[0_18px_42px_-28px_rgba(15,23,42,0.65)] transition-all duration-300 hover:-translate-y-1 hover:border-opacity-100 hover:shadow-[0_28px_58px_-30px_rgba(15,23,42,0.7)] ${t.glow} active:translate-y-0 sm:p-6`}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/42 to-transparent" />
                <div className={`pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full ${t.dot} opacity-[0.12]`} />
                {/* Dot coin — identique aux piliers */}
                <span className={`absolute right-5 top-5 h-2 w-2 rounded-full ${t.dot} opacity-60 transition-opacity group-hover:opacity-100`} />

                {/* Icône + titre — même structure que les piliers */}
                <div className={`relative mb-5 flex h-12 w-12 items-center justify-center rounded-[0.9rem] text-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 ${t.iconBg}`}>
                  {space.icon}
                </div>

                <div className="relative mb-2 flex items-start justify-between gap-3">
                  <h2 className="min-w-0 text-[18px] font-black leading-tight text-slate-950">
                    {space.label[locale]}
                  </h2>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${t.badge}`}>
                    {orderedItems.length}
                  </span>
                </div>

                {/* Séparateur coloré */}
                <div className={`relative mb-3 h-1 w-10 rounded-full ${t.divider}`} />

                {/* Rubriques — liste cliquable compacte */}
                <div className="relative flex-1">
                  {orderedItems.length > 0 ? (
                    <ul className="space-y-1">
                      {orderedItems.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            className={`group/item flex min-h-9 items-center gap-2 rounded-xl border border-transparent px-2.5 py-1.5 text-[13px] font-semibold text-slate-700 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 ${t.itemHover}`}
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
                <div className="relative mt-6">
                  <Link
                    href={firstHref}
                    className={`inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-4 text-[11px] font-black uppercase tracking-[0.14em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 ${t.cta}`}
                  >
                    <span>{locale === "fr" ? "Ouvrir" : "Open"}</span>
                    <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
