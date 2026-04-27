import {
 ArrowRight,
 BookOpen,
 BarChart3,
 FileText,
 GitBranch,
 Instagram,
 LayoutDashboard,
 Mail,
 Map as MapIcon,
 MapPin,
 Network,
 Shield,
 Target,
 Info,
 Users,
 Zap,
} from"lucide-react";
import Link from"next/link";
import Image from"next/image";
import { SitePreferencesControls } from"@/components/ui/site-preferences-controls";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { IMPACT_PROXY_CONFIG } from"@/lib/gamification/impact-proxy-config";
import { loadPilotageOverview } from"@/lib/pilotage/overview";
import { OriginCredibility } from"@/components/home/OriginCredibility";
import type { ActionDataContract } from"@/lib/actions/data-contract";
import {
 getNavigationSpacesForProfile,
 type NavigationItem,
} from"@/lib/navigation";

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

function sortItemsForPreview(
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

async function loadLandingOverview() {
 const supabase = getSupabaseServerClient();
 return loadPilotageOverview({
 supabase,
 periodDays: 365,
 limit: 5000,
 });
}

const HOMEPAGE_TEST_MARKERS = [
"test",
"demo",
"seed",
"sandbox",
"dummy",
"fake",
"runtime_seed",
"test_seed",
"quartier demo",
"zone test",
"lieu test",
"exemple",
] as const;

function isLikelyTestContract(contract: ActionDataContract): boolean {
 const haystack = [
 contract.id,
 contract.source,
 contract.location.label,
 contract.metadata.actorName ??"",
 contract.metadata.notes ??"",
 contract.metadata.notesPlain ??"",
 ]
 .join("")
 .toLowerCase();

 return HOMEPAGE_TEST_MARKERS.some((marker) => haystack.includes(marker));
}

function computeLandingCounters(contracts: ActionDataContract[], floorDate: string) {
 const inWindow = contracts.filter((contract) => {
 if (contract.status ==="rejected") {
 return false;
 }
 if (isLikelyTestContract(contract)) {
 return false;
 }
 return contract.dates.observedAt >= floorDate;
 });

 return {
 wasteKg: inWindow.reduce(
 (acc, contract) => acc + Number(contract.metadata.wasteKg || 0),
 0,
 ),
 butts: inWindow.reduce(
 (acc, contract) => acc + Number(contract.metadata.cigaretteButts || 0),
 0,
 ),
 volunteers: inWindow.reduce(
 (acc, contract) => acc + Number(contract.metadata.volunteersCount || 0),
 0,
 ),
 };
}

export default async function HomePage() {
 const overview = await loadLandingOverview().catch(() => null);
 const floor = new Date();
 floor.setUTCDate(floor.getUTCDate() - 365);
 const floorDate = floor.toISOString().slice(0, 10);
 const counters = overview
 ? computeLandingCounters(overview.contracts, floorDate)
 : null;
 const totalButts = counters?.butts ?? 0;
 const totalVolunteers = counters?.volunteers ?? 0;
 const wasteKg = counters?.wasteKg ?? overview?.comparison.current.impactVolumeKg ?? 0;
 const co2AvoidedKg = wasteKg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg;
 const waterSavedLiters = Math.round(
 totalButts * IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt,
 );
 const euroSaved = Math.round(
 wasteKg * IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg,
 );

 const hasOverviewData = Boolean(counters || overview);

 const heroStats = hasOverviewData
 ? [
 {
 value: `${wasteKg.toFixed(1)} kg`,
 label:"Masse de déchets récoltés",
 },
 {
 value: `${totalButts.toLocaleString()} mégots`,
 label:"Mégots retirés",
 },
 {
 value: `${totalVolunteers.toLocaleString()} bénévoles`,
 label:"Bénévoles mobilisés",
 },
 {
 value: `${co2AvoidedKg.toFixed(1)} kg CO2`,
 label:"CO2 évité",
 },
 {
 value: `${waterSavedLiters.toLocaleString()} L`,
 label:"Eau préservée",
 },
 {
 value: `${euroSaved.toLocaleString()} €`,
 label:"Économie de voirie",
 },
 ]
 : [
 { value:"n/a", label:"Masse de déchets récoltés" },
 { value:"n/a", label:"Mégots retirés" },
 { value:"n/a", label:"Bénévoles mobilisés" },
 { value:"n/a", label:"CO2 évité" },
 { value:"n/a", label:"Eau préservée" },
 { value:"n/a", label:"Économie de voirie" },
 ];

 const allMetrics = [
 {
 key:"wasteKg",
 label:"Déchets récoltés",
 value: heroStats[0].value,
 category:"Environnement",
 accent:"blue" as const,
 },
 {
 key:"co2",
 label:"CO₂ évité",
 value: heroStats[3].value,
 category:"Environnement",
 accent:"blue" as const,
 },
 {
 key:"water",
 label:"Eau préservée",
 value: heroStats[4].value,
 category:"Environnement",
 accent:"blue" as const,
 },
 {
 key:"butts",
 label:"Mégots retirés",
 value: heroStats[1].value,
 category:"Mobilisation",
 accent:"emerald" as const,
 },
 {
 key:"volunteers",
 label:"Bénévoles mobilisés",
 value: heroStats[2].value,
 category:"Mobilisation",
 accent:"emerald" as const,
 },
 {
 key:"euro",
 label:"Économie de voirie",
 value: heroStats[5].value,
 category:"Économique",
 accent:"amber" as const,
 },
 ];

 const homepageSpaces = getNavigationSpacesForProfile("benevole","exhaustif","fr");
 const homepageSpaceMap = new Map(homepageSpaces.map((space) => [space.id, space]));
 const getSpacePreview = (
 spaceId: keyof typeof BLOCK_PREVIEW_PRIORITY,
 ) => {
 const ordered = sortItemsForPreview(
 spaceId,
 homepageSpaceMap.get(spaceId)?.items ?? [],
 );
 return {
 mobile: ordered.slice(0, 2).map((item) => item.label.fr),
 desktop: ordered.slice(0, 3).map((item) => item.label.fr),
 };
 };

 return (
 <div className="min-h-screen overflow-hidden bg-slate-50 font-sans dark:bg-slate-950">
 <header className="relative overflow-hidden pt-16 pb-32 sm:pt-20 sm:pb-40 lg:pt-28 lg:pb-48">
 {/* ── couche 1 : fond de base ─────────────────────────────────── */}
 <div className="absolute inset-0 bg-[#0b1f3a] dark:bg-[#07111f]" />

 {/* ── couche 2 : dégradé directionnel riche ───────────────────── */}
 <div className="absolute inset-0 bg-gradient-to-br from-[#0b2a52] via-[#0d5570] to-[#0d6e50] opacity-90 dark:opacity-80" />

 {/* ── couche 3 : glow radial contrôlé ────────────────────────── */}
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,rgba(34,211,238,0.18),transparent),radial-gradient(ellipse_50%_50%_at_0%_100%,rgba(16,185,129,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,rgba(34,211,238,0.10),transparent),radial-gradient(ellipse_50%_50%_at_0%_100%,rgba(16,185,129,0.08),transparent)]" />

 {/* ── couche 4 : texture grain (svg data-uri) ─────────────────── */}
 <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")"}} />

 {/* ── couche 5 : logo watermark droit ─────────────────────────── */}
 <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-[640px] h-[640px] opacity-[0.05] dark:opacity-[0.03] select-none hidden lg:block">
 <Image
 src="/brand/logo-cleanmymap-officiel.svg"
 alt=""
 fill
 sizes="(min-width: 1024px) 640px, 0px"
 className="object-contain"
 priority
 />
 </div>

 {/* ── contenu ──────────────────────────────────────────────────── */}
 <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12">
 <div className="mx-auto max-w-7xl">

 {/* carte glassmorphism */}
 <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)] px-8 py-10 sm:px-14 sm:py-14 lg:px-20 lg:py-20 space-y-10">

 {/* sélecteur langue */}
 <div className="flex justify-start">
 <SitePreferencesControls variant="locale" />
 </div>

 {/* titre principal */}
 <div className="space-y-4 sm:space-y-5">
 <h1 className="font-bold text-white tracking-tighter leading-[0.95] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100"
 style={{fontSize:"clamp(3.5rem, 12vw, 7.5rem)"}}>
 Clean My Map
 </h1>

 {/* slogan en sous-titre */}
 <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 flex items-center gap-3 pt-1 sm:gap-4">
 <span className="h-px w-10 sm:w-16 bg-gradient-to-r from-emerald-500/50 to-transparent" />
 <p className="rounded-full border border-emerald-300/25 bg-emerald-400/8 px-3 py-1 cmm-text-caption sm:cmm-text-caption md:cmm-text-small font-bold uppercase tracking-[0.34em] text-emerald-300/95 whitespace-nowrap">
 Dépolluer <span className="mx-1 opacity-30">·</span> Cartographier <span className="mx-1 opacity-30">·</span> Impacter
 </p>
 </div>
 </div>

 {/* paragraphe */}
 <p className="animate-in fade-in slide-in-from-bottom-7 duration-700 delay-200 max-w-3xl text-lg sm:text-xl text-white/92 leading-[1.65] font-light pt-2">
 Mutualisez vos cleanwalks, visualisez les zones prioritaires sur une carte commune et générez des rapports d&apos;impact automatisés pour votre RSE, les collectivités et les élus. <span className="italic opacity-90">Cultivons l&apos;entraide.</span>
 </p>

 {/* CTA Container */}
 <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 flex flex-col sm:flex-row sm:flex-wrap items-center gap-3 sm:gap-4 pt-2">
 
 {/* PRIMAIRE 1 : Consulter la carte */}
 <Link
 href="/actions/map"
 className="group inline-flex w-full sm:w-auto h-14 items-center justify-center gap-3 rounded-2xl bg-white px-8 text-base font-bold text-blue-900 shadow-[0_8px_32px_-6px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-8px_rgba(0,0,0,0.5)] active:translate-y-0 active:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b2a52] whitespace-nowrap"
 >
 Consulter la carte
 <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
 </Link>

 {/* PRIMAIRE 2 : Déclarer une action */}
 <Link
 href="/actions/new"
 className="group inline-flex w-full sm:w-auto h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 text-base font-bold text-white shadow-[0_8px_32px_-6px_rgba(6,182,212,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-8px_rgba(6,182,212,0.6)] hover:from-cyan-400 hover:to-emerald-400 active:translate-y-0 active:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b2a52] whitespace-nowrap"
 >
 Déclarer une action
 <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
 </Link>

 {/* SECONDAIRE 0 : Explorer le plan du site */}
 <Link
 href="/explorer"
 className="inline-flex w-full sm:w-auto h-14 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/8 px-7 cmm-text-small font-bold uppercase tracking-wider text-white transition-all duration-300 hover:border-cyan-300/50 hover:bg-white/15 hover:text-cyan-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 whitespace-nowrap"
 >
 Explorer
 <ArrowRight size={16} />
 </Link>

 {/* SECONDAIRE 1 : Se connecter (Plus visible) */}
 <Link
 href="/sign-in"
 className="inline-flex w-full sm:w-auto h-14 items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/10 px-8 text-base font-bold text-white transition-all duration-300 hover:border-white/80 hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 whitespace-nowrap"
 >
 Se connecter
 </Link>

 {/* SECONDAIRE 2 : Rapport d'impact */}
 <Link
 href="/reports"
 className="inline-flex w-full sm:w-auto h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 cmm-text-small font-bold text-white/90 transition-all duration-300 hover:border-white/30 hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 whitespace-nowrap"
 >
 Rapport d’impact
 </Link>

 </div>

 </div>
 </div>
 </div>
 </header>

 {/* ── Section données agrégées ───────────────────────────────── */}
 <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-8 lg:px-12 -mt-16 sm:-mt-20 lg:-mt-24">
 <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/70 bg-white/95 backdrop-blur-xl shadow-2xl shadow-blue-950/10 dark:border-slate-700/50 dark:bg-slate-900/95 dark:shadow-slate-950/50">

 {/* watermark logo en fond */}
 <div className="pointer-events-none absolute right-0 bottom-0 w-[480px] h-[160px] opacity-[0.03] dark:opacity-[0.02] select-none overflow-hidden">
 <Image
 src="/brand/logo-cleanmymap-officiel.svg"
 alt=""
 fill
 sizes="480px"
 className="object-contain object-right-bottom"
 />
 </div>

 {/* barre accent supérieure */}
 <div className="h-[4px] w-full bg-gradient-to-r from-blue-700 via-cyan-500 to-emerald-500" />

 <div className="relative px-6 sm:px-10 py-10 sm:py-12 lg:px-16 lg:py-14">

 {/* en-tête de section */}
 <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
 <div className="space-y-2">
 <div className="flex items-center gap-3">
 <span className="inline-block h-4 w-4 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 shadow-sm" />
 <h2 className="cmm-text-small font-bold uppercase tracking-[0.25em] cmm-text-primary dark:text-white whitespace-nowrap">
 Impact consolidé — 12 mois
 </h2>
 </div>
 <p className="pl-[28px] cmm-text-small cmm-text-muted dark:cmm-text-muted">
 Données terrain certifiées. Formules exposées en <Link href="/methodologie" className="text-blue-600 hover:underline">méthodologie</Link>.
 </p>
 </div>
 <Link
 href="/methodologie"
 title="Comprendre le calcul des indicateurs"
 className="inline-flex w-max items-center gap-2.5 self-start rounded-xl border border-slate-200 bg-white px-5 py-3 cmm-text-small font-bold uppercase tracking-widest cmm-text-secondary shadow-sm transition-all duration-300 hover:border-blue-400 hover:text-blue-700 hover:shadow-lg active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:text-blue-300 whitespace-nowrap"
 >
 <Info size={14} />
 Méthodologie
 </Link>
 </div>

 {/* grille KPI unique 3 col */}
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
 {allMetrics.map((m) => {
 const accentStyles = {
 blue: {
 bar:"bg-blue-600",
 badge:"bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800/40",
 value:"text-blue-900 dark:text-blue-100",
 card:"hover:shadow-blue-200/40 dark:hover:shadow-blue-900/40",
 },
 emerald: {
 bar:"bg-emerald-500",
 badge:"bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/40",
 value:"text-emerald-900 dark:text-emerald-100",
 card:"hover:shadow-emerald-200/40 dark:hover:shadow-emerald-900/40",
 },
 amber: {
 bar:"bg-amber-500",
 badge:"bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/40",
 value:"text-amber-900 dark:text-amber-100",
 card:"hover:shadow-amber-200/40 dark:hover:shadow-amber-900/40",
 },
 } as const;
 const s = accentStyles[m.accent];

 return (
 <div
 key={m.key}
 className={`group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-50/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/30 ${s.card}`}
 >
 {/* barre accent gauche */}
 <div className={`absolute inset-y-0 left-0 w-[4px] ${s.bar}`} />

 {/* badge catégorie + période */}
 <div className="mb-5 flex items-center justify-between">
 <span className={`inline-flex items-center rounded-lg px-2.5 py-1 cmm-text-caption font-bold uppercase tracking-widest ring-1 ${s.badge} whitespace-nowrap`}>
 {m.category}
 </span>
 <span className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted dark:cmm-text-muted whitespace-nowrap">
 12 Mois
 </span>
 </div>

 {/* valeur */}
 <div className={`font-bold tabular-nums leading-none tracking-tighter ${s.value} text-wrap`}
 style={{fontSize:"clamp(1.75rem, 3.2vw, 2.75rem)"}}>
 {m.value}
 </div>

 {/* libellé */}
 <p className="mt-4 cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted dark:cmm-text-muted leading-tight">
 {m.label}
 </p>
 </div>
 );
 })}
 </div>

 </div>
 </div>
 </div>

 <section className="relative w-full overflow-hidden px-3 py-16 sm:px-5 sm:py-20 lg:px-8 lg:py-24">
 {/* fond travaillé cohérent avec le site */}
 <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0b2040] to-[#082a1e] dark:from-slate-950 dark:via-[#060f20] dark:to-[#041710]" />
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_80%_20%,rgba(34,211,238,0.07),transparent),radial-gradient(ellipse_50%_60%_at_10%_80%,rgba(16,185,129,0.07),transparent)]" />
 <div className="absolute inset-0 opacity-[0.025]" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")"}} />

 <div className="relative z-10 mx-auto max-w-7xl">
 {/* en-tête */}
 <div className="mb-10 space-y-2 text-center px-4">
 <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl" style={{textWrap:"pretty"}}>
 Les sept piliers de CleanMyMap
 </h2>
 <p className="cmm-text-small font-light text-white/55 sm:text-base mx-auto max-w-2xl leading-relaxed">
 Agir, visualiser, apprendre et piloter vos initiatives environnementales.
 </p>
 </div>

 {/* Grille flexible pour garantir le centrage des éléments orphelins (7 items) */}
 <div className="flex flex-wrap justify-center gap-4 px-4">
 {[
 {
 icon: LayoutDashboard,
 title:"Accueil",
 preview: getSpacePreview("home"),
 iconBg:"bg-slate-700/60",
 iconColor:"text-slate-200",
 accent:"from-slate-700/30 to-slate-600/10",
 ring:"ring-slate-600/40",
 dot:"bg-slate-400",
 href:"/dashboard",
 },
 {
 icon: Zap,
 title:"Agir",
 preview: getSpacePreview("act"),
 iconBg:"bg-amber-900/50",
 iconColor:"text-amber-300",
 accent:"from-amber-900/30 to-amber-800/10",
 ring:"ring-amber-700/40",
 dot:"bg-amber-400",
 href:"/sections/route",
 },
 {
 icon: MapIcon,
 title:"Visualiser",
 preview: getSpacePreview("visualize"),
 iconBg:"bg-sky-900/50",
 iconColor:"text-sky-300",
 accent:"from-sky-900/30 to-sky-800/10",
 ring:"ring-sky-700/40",
 dot:"bg-sky-400",
 href:"/actions/map",
 },
 {
 icon: Target,
 title:"Impact",
 preview: getSpacePreview("impact"),
 iconBg:"bg-emerald-900/50",
 iconColor:"text-emerald-300",
 accent:"from-emerald-900/30 to-emerald-800/10",
 ring:"ring-emerald-700/40",
 dot:"bg-emerald-400",
 href:"/reports",
 },
 {
 icon: Network,
 title:"Réseau",
 preview: getSpacePreview("network"),
 iconBg:"bg-violet-900/50",
 iconColor:"text-violet-300",
 accent:"from-violet-900/30 to-violet-800/10",
 ring:"ring-violet-700/40",
 dot:"bg-violet-400",
 href:"/partners/network",
 },
 {
 icon: BookOpen,
 title:"Apprendre",
 preview: getSpacePreview("learn"),
 iconBg:"bg-rose-900/50",
 iconColor:"text-rose-300",
 accent:"from-rose-900/30 to-rose-800/10",
 ring:"ring-rose-700/40",
 dot:"bg-rose-400",
 href:"/learn/hub",
 },
 {
 icon: Target,
 title:"Piloter",
 preview: getSpacePreview("pilot"),
 iconBg:"bg-indigo-900/50",
 iconColor:"text-indigo-300",
 accent:"from-indigo-900/30 to-indigo-800/10",
 ring:"ring-indigo-700/40",
 dot:"bg-indigo-400",
 href:"/admin",
 },
 ].map((bloc) => (
 <Link
 key={bloc.title}
 href={bloc.href}
 className={`group relative flex w-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${bloc.accent} ring-1 ${bloc.ring} p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-2xl hover:shadow-black/40 active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:w-[calc(50%-1rem)] md:w-[calc(33.333%-1.1rem)] xl:w-[calc(25%-1.2rem)]`}
 >
 {/* coin accent dot */}
 <span className={`absolute right-5 top-5 h-2 w-2 rounded-full ${bloc.dot} opacity-60 group-hover:opacity-100 transition-opacity`} />

 {/* icône */}
 <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${bloc.iconBg} ${bloc.iconColor} transition-transform duration-300 group-hover:scale-110 shadow-lg`}>
 <bloc.icon size={24} />
 </div>

 {/* titre */}
 <h3 className="mb-2 text-base font-bold text-white leading-tight">
 {bloc.title}
 </h3>

 {/* description — 2 lignes max */}
 <p className="flex-1 text-[13px] leading-relaxed text-white/60 group-hover:text-white/80 transition-colors" style={{textWrap:"pretty"}}>
 {bloc.preview.desktop.length === 0 ? (
"Rubriques en cours de configuration."
 ) : (
 <>
 <span className="sm:hidden">{bloc.preview.mobile.join(",")}</span>
 <span className="hidden sm:inline">{bloc.preview.desktop.join(",")}</span>
 </>
 )}
 </p>

 {/* lien */}
 <div className={`mt-5 flex items-center gap-2 cmm-text-caption font-bold uppercase tracking-widest ${bloc.iconColor} opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap`}>
 Accéder <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" />
 </div>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* ── Section 1 : Pourquoi CleanMyMap ────────────────────────── */}
 <section className="relative w-full overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
 <div className="absolute inset-0 cmm-surface" />
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(14,116,144,0.06),transparent)] dark:bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(34,211,238,0.04),transparent)]" />

 <div className="relative z-10 mx-auto max-w-7xl px-4">
 <div className="mb-12 space-y-3 text-center">
 <p className="cmm-text-caption font-bold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-400">
 Bénéfices
 </p>
 <h2 className="text-3xl font-bold tracking-tight cmm-text-primary sm:text-4xl lg:text-5xl dark:text-white" style={{textWrap:"pretty"}}>
 Pourquoi utiliser CleanMyMap ?
 </h2>
 <p className="mx-auto max-w-2xl text-base font-light cmm-text-muted sm:text-lg dark:cmm-text-muted leading-relaxed">
 Un seul outil pour structurer, mesurer et valoriser vos actions terrain.
 </p>
 </div>

 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
 {[
 {
 icon: MapPin,
 title:"Centralisez vos cleanwalks",
 desc:"Toutes vos actions terrain en un seul endroit : dates, lieux, volumes, participants. Fini les tableurs éparpillés.",
 color:"text-cyan-700 dark:text-cyan-400",
 bg:"bg-cyan-50 dark:bg-cyan-950/30",
 border:"border-cyan-100 dark:border-cyan-900/40",
 },
 {
 icon: MapIcon,
 title:"Visualisez sur une carte commune",
 desc:"Chaque action apparaît sur une carte partagée avec la communauté. Repérez les zones couvertes et les zones prioritaires.",
 color:"text-sky-700 dark:text-sky-400",
 bg:"bg-sky-50 dark:bg-sky-950/30",
 border:"border-sky-100 dark:border-sky-900/40",
 },
 {
 icon: BarChart3,
 title:"Suivez votre impact réel",
 desc:"Déchets collectés, mégots retirés, bénévoles mobilisés, CO₂ évité : des indicateurs concrets calculés depuis vos données.",
 color:"text-emerald-700 dark:text-emerald-400",
 bg:"bg-emerald-50 dark:bg-emerald-950/30",
 border:"border-emerald-100 dark:border-emerald-900/40",
 },
 {
 icon: Users,
 title:"Coordonnez les acteurs locaux",
 desc:"Mettez en relation associations, bénévoles et partenaires locaux pour organiser des opérations collectives plus efficaces.",
 color:"text-violet-700 dark:text-violet-400",
 bg:"bg-violet-50 dark:bg-violet-950/30",
 border:"border-violet-100 dark:border-violet-900/40",
 },
 {
 icon: FileText,
 title:"Produisez des rapports utiles",
 desc:"Générez des rapports d'impact pour votre RSE, vos dossiers de subvention, les collectivités et les élus locaux.",
 color:"text-indigo-700 dark:text-indigo-400",
 bg:"bg-indigo-50 dark:bg-indigo-950/30",
 border:"border-indigo-100 dark:border-indigo-900/40",
 },
 {
 icon: Shield,
 title:"Donnez de la crédibilité à vos actions",
 desc:"Chiffres sourcés, méthodologie transparente et données terrain vérifiables : renforcez la légitimité de votre engagement.",
 color:"text-rose-700 dark:text-rose-400",
 bg:"bg-rose-50 dark:bg-rose-950/30",
 border:"border-rose-100 dark:border-rose-900/40",
 },
 ].map((item) => (
 <div
 key={item.title}
 className={`flex flex-col rounded-[2rem] border ${item.border} ${item.bg} p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:hover:shadow-black/50`}
 >
 <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 dark:ring-white/5 ${item.color}`}>
 <item.icon size={28} />
 </div>
 <h3 className="mb-3 text-lg font-bold cmm-text-primary dark:text-white">
 {item.title}
 </h3>
 <p className="cmm-text-small leading-relaxed cmm-text-secondary dark:cmm-text-muted" style={{textWrap:"pretty"}}>
 {item.desc}
 </p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ── Section fusionnée : Origine, terrain et crédibilité ────── */}
 <OriginCredibility />

 {/* ── Footer compact : Contact + Slogan + Copyright ─────────────────── */}
 <footer className="relative w-full overflow-hidden border-t border-white/5 bg-slate-950">
 <div className="absolute inset-0 bg-gradient-to-br from-[#061a14] via-slate-950 to-slate-950 opacity-90" />
 
 <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 sm:py-16">
 <div className="flex flex-col items-center justify-between gap-12 lg:flex-row lg:gap-8">
 
 {/* Gauche : Contact discret */}
 <div className="flex flex-col items-center lg:items-start space-y-3">
 <div className="flex items-center gap-3">
 <span className="h-px w-6 bg-emerald-500/60" />
 <p className="cmm-text-caption font-bold uppercase tracking-[0.3em] text-emerald-400">Contact</p>
 </div>
 <p className="text-base text-slate-300 font-light text-center lg:text-left">
 Une question ou un partenariat ? Échangeons.
 </p>
 </div>

 {/* Centre : Liens de contact compacts */}
 <div className="flex flex-wrap justify-center gap-5">
 <a
 href="mailto:maxence.drm@gmail.com"
 className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 transition-all hover:border-emerald-500/40 hover:bg-white/10 hover:shadow-lg hover:shadow-emerald-500/5"
 >
 <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
 <Mail size={18} className="text-emerald-400" />
 </div>
 <span className="cmm-text-small font-bold text-slate-200 group-hover:text-white transition-colors">maxence.drm@gmail.com</span>
 </a>
 <a
 href="https://instagram.com/max_drm4"
 target="_blank"
 rel="noopener noreferrer"
 className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 transition-all hover:border-pink-500/40 hover:bg-white/10 hover:shadow-lg hover:shadow-pink-500/5"
 >
 <div className="p-2 bg-pink-500/20 rounded-lg group-hover:bg-pink-500/30 transition-colors">
 <Instagram size={18} className="text-pink-400" />
 </div>
 <span className="cmm-text-small font-bold text-slate-200 group-hover:text-white transition-colors">@max_drm4</span>
 </a>
 </div>

 {/* Droite : Slogan, Mantra & Copyright unifiés sur une ligne desktop */}
 <div className="flex flex-col items-center text-center lg:items-end lg:text-right space-y-4">
 <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
 <p className="text-base sm:text-lg font-bold tracking-tight text-white uppercase whitespace-nowrap">
 Dépolluer <span className="text-cyan-400/50">·</span> Cartographier <span className="text-emerald-400/50">·</span> Impacter
 </p>
 <span className="hidden lg:block h-6 w-px bg-white/10" />
 <div className="flex items-center justify-center gap-4">
 <p className="cmm-text-caption font-bold tracking-[0.25em] text-emerald-400/90 uppercase whitespace-nowrap">Cultivons l&apos;entraide</p>
 <span className="h-1 w-1 rounded-full bg-slate-700" />
 <p className="cmm-text-caption font-medium cmm-text-muted/80 uppercase tracking-widest whitespace-nowrap">© 2026 CleanMyMap</p>
 </div>
 </div>
 </div>

 </div>
 </div>
 </footer>
 </div>
 );
}
