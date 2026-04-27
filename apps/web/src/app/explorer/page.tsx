import Link from"next/link";
import { ArrowRight, ChevronRight, LayoutGrid, Layers, User } from"lucide-react";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from"@/lib/authz";
import {
 getNavigationSpacesForProfile,
 type NavigationItem,
} from"@/lib/navigation";
import { getProfileLabel, toProfile } from"@/lib/profiles";
import {
 getServerDisplayModePreference,
 getServerLocale,
} from"@/lib/server-preferences";
import { AppNavigationRibbon } from"@/components/navigation/app-navigation-ribbon";

const BLOCK_PREVIEW_PRIORITY: Record<
"home" |"act" |"visualize" |"impact" |"network" |"learn" |"pilot",
 Partial<Record<NavigationItem["id"], number>>
> = {
 home: {
 dashboard: 1,
 profile: 2,
 },
 act: {
 new: 1,
 route: 2,
"trash-spotter": 3,
 },
 visualize: {
 map: 1,
 sandbox: 2,
 weather: 3,
 },
 impact: {
 reports: 1,
 gamification: 2,
 },
 network: {
 network: 1,
 annuaire: 2,
 community: 3,
 messagerie: 4,
"open-data": 5,
 funding: 6,
 actors: 7,
 },
 learn: {
 hub: 1,
 guide: 2,
 climate: 3,
 recycling: 4,
 },
 pilot: {
 admin: 1,
 sponsor: 2,
 elus: 3,
 godmode: 4,
 },
};

function getOrderedPreviewItems(
 blockId: keyof typeof BLOCK_PREVIEW_PRIORITY,
 items: NavigationItem[],
): NavigationItem[] {
 const blockPriority = BLOCK_PREVIEW_PRIORITY[blockId];
 return [...items].sort((a, b) => {
 const pa = blockPriority[a.id] ?? 99;
 const pb = blockPriority[b.id] ?? 99;
 if (pa !== pb) {
 return pa - pb;
 }
 return a.label.fr.localeCompare(b.label.fr,"fr");
 });
}

function getBlockAccent(blockId: keyof typeof BLOCK_PREVIEW_PRIORITY) {
 const byBlock = {
 home: { bar:"bg-slate-400", glow:"shadow-slate-950/10", tint:"from-slate-50 to-white" },
 act: { bar:"bg-amber-400", glow:"shadow-amber-500/10", tint:"from-amber-50 to-white" },
 visualize: { bar:"bg-sky-400", glow:"shadow-sky-500/10", tint:"from-sky-50 to-white" },
 impact: { bar:"bg-emerald-400", glow:"shadow-emerald-500/10", tint:"from-emerald-50 to-white" },
 network: { bar:"bg-violet-400", glow:"shadow-violet-500/10", tint:"from-violet-50 to-white" },
 learn: { bar:"bg-rose-400", glow:"shadow-rose-500/10", tint:"from-rose-50 to-white" },
 pilot: { bar:"bg-indigo-400", glow:"shadow-indigo-500/10", tint:"from-indigo-50 to-white" },
 } as const;
 return byBlock[blockId];
}

export default async function ExplorerPage() {
 const locale = await getServerLocale();
 const displayModePreference = await getServerDisplayModePreference();
 const role = await getCurrentUserRoleLabel();
 const identity = await getCurrentUserIdentity();
 const currentProfile = toProfile(role);
 const profileLabel = getProfileLabel(currentProfile, locale);
 const spaces = getNavigationSpacesForProfile(
 currentProfile,
 displayModePreference.displayMode,
 locale,
 );
 const totalItems = spaces.reduce((sum, space) => sum + space.items.length, 0);

 return (
 <div className="space-y-3 sm:space-y-6">
 <AppNavigationRibbon
 currentProfile={currentProfile}
 profileLabel={profileLabel}
 identity={identity}
 />
 <div className="relative overflow-hidden">
 {/* Fond : dégradé doux + quadrillage très atténué (utilitaire, pas marketing) */}
 <div className="pointer-events-none absolute inset-0">
 <div className="absolute inset-0 bg-gradient-to-br from-[#0b2a52]/6 via-white to-emerald-500/6 dark:from-[#0b2a52]/18 dark:via-slate-950 dark:to-emerald-500/14" />
 <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,rgba(15,23,42,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.18)_1px,transparent_1px)] [background-size:44px_44px] dark:opacity-[0.04]" />
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(34,211,238,0.10),transparent),radial-gradient(ellipse_40%_40%_at_0%_100%,rgba(16,185,129,0.08),transparent)] dark:bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(34,211,238,0.08),transparent),radial-gradient(ellipse_40%_40%_at_0%_100%,rgba(16,185,129,0.06),transparent)]" />
 </div>

 <div className="relative mx-auto min-h-full w-full max-w-7xl space-y-3 px-3 py-4 sm:space-y-6 sm:px-8 sm:py-8 lg:py-12">
 <section className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:rounded-[2rem] sm:p-6 dark:border-slate-800/70 dark:bg-slate-950/55">
 <div className="flex flex-wrap items-start justify-between gap-4">
 <div className="space-y-2">
 <p className="cmm-text-caption font-bold uppercase tracking-[0.22em] cmm-text-muted dark:cmm-text-muted">
 {locale ==="fr" ?"Navigation utilitaire" :"Utility navigation"}
 </p>
 <h1 className="text-[1.15rem] font-bold tracking-tight cmm-text-primary sm:text-3xl dark:text-white">
 {locale ==="fr" ?"Plan du site" :"Site map"}
 </h1>
 <p className="max-w-2xl cmm-text-caption leading-[1.5] cmm-text-secondary sm:text-base sm:leading-relaxed">
 {locale ==="fr"
 ?"Vue compacte de toutes les rubriques accessibles pour votre profil. Objectif : trouver et ouvrir rapidement la bonne page."
 :"Compact view of all accessible sections for your profile. Goal: quickly find and open the right page."}
 </p>
 </div>
 <div className="grid grid-cols-3 gap-1.5 text-center sm:gap-2">
 <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-2 py-1.5 shadow-sm sm:px-3 sm:py-2 dark:border-slate-800/80 dark:bg-slate-950/40">
 <div className="text-lg font-bold cmm-text-primary dark:text-white">{spaces.length}</div>
 <div className="cmm-text-caption font-bold uppercase tracking-wider cmm-text-muted dark:cmm-text-muted">
 {locale ==="fr" ?"Blocs" :"Blocks"}
 </div>
 </div>
 <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-2 py-1.5 shadow-sm sm:px-3 sm:py-2 dark:border-slate-800/80 dark:bg-slate-950/40">
 <div className="text-lg font-bold cmm-text-primary dark:text-white">{totalItems}</div>
 <div className="cmm-text-caption font-bold uppercase tracking-wider cmm-text-muted dark:cmm-text-muted">
 {locale ==="fr" ?"Rubriques" :"Sections"}
 </div>
 </div>
 <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 px-2 py-1.5 shadow-sm sm:px-3 sm:py-2 dark:border-emerald-900/50 dark:bg-emerald-950/30">
 <div className="cmm-text-caption font-bold uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-200">
 {locale ==="fr" ?"Profil actif" :"Active profile"}
 </div>
 <div className="cmm-text-caption font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
 {profileLabel}
 </div>
 </div>
 </div>
 </div>
 </section>

 <section className="sticky top-[5.2rem] z-20 rounded-[1.5rem] border border-slate-200/70 bg-white/85 p-2.5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)] backdrop-blur sm:static sm:rounded-2xl sm:bg-white/80 sm:p-4 sm:backdrop-blur-0 dark:border-slate-800/70 dark:bg-slate-950/55">
 <div className="mb-2 flex items-center gap-2 cmm-text-caption font-bold uppercase tracking-[0.22em] cmm-text-muted sm:mb-3 sm:cmm-text-caption dark:cmm-text-muted">
 <LayoutGrid className="h-4 w-4" />
 {locale ==="fr" ?"Accès rapide blocs" :"Quick block access"}
 </div>
 <div className="flex flex-wrap gap-1.5 sm:gap-2">
 {spaces.map((space) => (
 (() => {
 const accent = getBlockAccent(space.id);
 return (
 <a
 key={space.id}
 href={`#bloc-${space.id}`}
 className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-2 py-1 cmm-text-caption font-semibold leading-none cmm-text-secondary shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:cmm-text-primary hover:shadow-md sm:gap-2 sm:px-3 sm:py-1.5 sm:cmm-text-caption dark:border-slate-700/80 dark:bg-slate-900/70 dark:hover:border-emerald-700 dark:hover:bg-slate-900"
 >
 <span className={`h-1.5 w-1.5 rounded-full ${accent.bar}`} />
 <span>{space.icon}</span>
 <span>{space.label[locale]}</span>
 <span className="rounded-full bg-white px-1.5 py-0.5 cmm-text-caption cmm-text-muted">
 {space.items.length}
 </span>
 </a>
 );
 })()
 ))}
 </div>
 </section>

 <section className="space-y-2.5 sm:space-y-4">
 {spaces.map((space) => {
 const orderedItems = getOrderedPreviewItems(space.id, space.items);
 const firstHref = orderedItems[0]?.href ??"/dashboard";
 const accent = getBlockAccent(space.id);
 return (
 <article
 key={space.id}
 id={`bloc-${space.id}`}
 className={`scroll-mt-28 overflow-hidden rounded-[1.6rem] border border-slate-200/70 bg-gradient-to-b ${accent.tint} p-2.5 shadow-[0_22px_52px_-42px_rgba(15,23,42,0.42)] transition hover:-translate-y-0.5 hover:shadow-[0_34px_70px_-52px_rgba(15,23,42,0.55)] sm:rounded-[2rem] sm:p-5 dark:border-slate-800/70 dark:bg-slate-950`}
 >
 <div className={`absolute left-0 top-0 h-full w-1 ${accent.bar} opacity-70`} />
 <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:mb-4 sm:gap-3 sm:pb-3">
 <div className="flex items-center gap-3">
 <div className="relative">
 <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-base shadow-sm ring-1 ring-black/5 sm:h-10 sm:w-10 sm:text-lg dark:bg-slate-900/80 dark:ring-white/10">
 {space.icon}
 </span>
 <span className={`absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full ${accent.bar} ring-2 ring-white dark:ring-slate-950`} />
 </div>
 <div>
 <p className={`cmm-text-caption font-bold uppercase tracking-[0.18em] ${space.color}`}>
 {locale ==="fr" ?"Bloc" :"Block"}
 </p>
 <h2 className="text-[15px] font-bold leading-tight cmm-text-primary sm:text-xl dark:text-white">
 {space.label[locale]}
 </h2>
 </div>
 </div>
 <Link
 href={firstHref}
 className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-1 cmm-text-caption font-bold uppercase tracking-wider cmm-text-secondary shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:cmm-text-primary hover:shadow-md sm:gap-2 sm:px-3 sm:py-1.5 sm:cmm-text-caption dark:border-slate-700/80 dark:bg-slate-900/70 dark:hover:border-emerald-700"
 >
 <ArrowRight className="h-4 w-4" />
 {locale ==="fr" ?"Ouvrir le bloc" :"Open block"}
 </Link>
 </div>

 {orderedItems.length > 0 ? (
 <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
 {orderedItems.map((item) => (
 <Link
 key={item.id}
 href={item.href}
 title={item.description[locale]}
 className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 sm:px-4 sm:py-3 dark:border-slate-800/70 dark:bg-slate-900/55 dark:hover:border-emerald-700"
 >
 <span className="min-w-0">
 <span className="line-clamp-1 block text-[13px] font-semibold leading-tight cmm-text-primary sm:cmm-text-small dark:text-white">
 {item.label[locale]}
 </span>
 <span className="line-clamp-1 cmm-text-caption leading-tight cmm-text-secondary sm:line-clamp-2 sm:cmm-text-caption">
 {item.description[locale]}
 </span>
 </span>
 <ChevronRight className="h-4 w-4 shrink-0 cmm-text-muted transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:cmm-text-muted" />
 </Link>
 ))}
 </div>
 ) : (
 <div className="rounded-2xl border border-dashed border-slate-200/70 bg-white/60 px-4 py-3 cmm-text-caption font-semibold uppercase tracking-wider cmm-text-muted dark:border-slate-800/70 dark:bg-slate-900/40 dark:cmm-text-muted">
 {locale ==="fr" ?"Aucune rubrique accessible sur ce bloc" :"No section available in this block"}
 </div>
 )}
 </article>
 );
 })}
 </section>
 </div>
 </div>
 </div>
 );
}
