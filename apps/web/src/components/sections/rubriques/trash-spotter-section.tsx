"use client";

import { motion } from "framer-motion";
import {
  Leaf,
  MessageSquareMore,
  MapPin,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { ActionsMapFeed } from "@/components/actions/map-feed/actions-map-feed";
import { useTrashSpotter } from "./use-trash-spotter";
import { SpotterForm, SpotterRecentList } from "./trash-spotter-components";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function resolveUrgencyLabel(fr: boolean, coveragePercent: number) {
  if (coveragePercent >= 70) {
    return fr ? "Élevée" : "High";
  }
  if (coveragePercent >= 40) {
    return fr ? "Modérée" : "Moderate";
  }
  return fr ? "À surveiller" : "Watch";
}

export function TrashSpotterSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const {
    spotType,
    setSpotType,
    spotLabel,
    setSpotLabel,
    spotLatitude,
    setSpotLatitude,
    spotLongitude,
    setSpotLongitude,
    spotNotes,
    setSpotNotes,
    spotState,
    spotMessage,
    onCreateSpot,
    isLoading,
    error,
    quality,
  } = useTrashSpotter(fr);

  const coveragePercent =
    quality.received > 0 ? Math.round((quality.withCoords / quality.received) * 100) : 0;
  const urgencyLabel = resolveUrgencyLabel(fr, coveragePercent);

  return (
    <SectionShell
      id="trash-spotter"
      hideHeader
      gradient="from-emerald-100/80 via-emerald-50 to-transparent"
    >
      <div className="space-y-8 pt-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative overflow-hidden rounded-[2.75rem] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(250,253,248,0.98),rgba(243,249,241,0.98))] p-6 shadow-[0_32px_100px_-48px_rgba(34,197,94,0.28)] sm:p-8 lg:p-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(187,247,208,0.45),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(134,239,172,0.2),transparent_30%)]" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)] lg:items-center">
            <motion.div variants={itemVariants} className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-[clamp(2.9rem,6vw,5.4rem)] font-black leading-[0.94] tracking-[-0.06em] text-emerald-950">
                  {fr ? "Signalement de déchets" : "Trash Spotter"}
                </h1>
              </div>

              <p className="max-w-2xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                {fr
                  ? "Signalement rapide et cartographie collaborative des zones à traiter."
                  : "Fast reporting and collaborative mapping of areas to treat."}
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="relative min-h-[240px] overflow-hidden rounded-[2.25rem] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(234,247,231,0.92),rgba(248,252,246,0.98))] shadow-[0_20px_56px_-34px_rgba(22,163,74,0.22)]"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-300" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(134,239,172,0.45),transparent_25%),radial-gradient(circle_at_20%_80%,rgba(187,247,208,0.45),transparent_24%)]" />

              <div className="relative h-full p-5">
                <div className="absolute left-6 top-6 flex gap-2">
                  <div className="h-4 w-4 rounded-full bg-emerald-500/80" />
                  <div className="h-4 w-4 rounded-full bg-emerald-300/70" />
                  <div className="h-4 w-4 rounded-full bg-white/80" />
                </div>

                <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(16,76,44,0.08))]" />
                <div className="absolute right-6 top-8 h-28 w-28 rounded-full bg-emerald-200/50 blur-3xl" />
                <div className="absolute bottom-7 left-5 right-5 rounded-[2rem] border border-emerald-200/70 bg-white/74 p-4 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.25)] backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">
                        {fr ? "Signalements actifs" : "Active reports"}
                      </p>
                      <p className="text-3xl font-black tracking-[-0.06em] text-emerald-950">
                        {quality.received}
                      </p>
                    </div>
                    <div className="space-y-2 text-right">
                      <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">
                        {fr ? "En direct" : "Live"}
                      </div>
                      <div className="rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-900">
                        {coveragePercent}% · {urgencyLabel}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-emerald-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: `${Math.max(24, coveragePercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            id="trash-spotter-form"
            className="scroll-mt-24"
          >
            {isLoading ? (
              <div className="rounded-[2rem] border border-emerald-100 bg-white/90 p-6 shadow-[0_18px_48px_-34px_rgba(34,197,94,0.22)]">
                <div className="h-[36rem] rounded-[1.75rem] bg-slate-100" />
              </div>
            ) : error ? (
              <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-[0_18px_48px_-34px_rgba(244,63,94,0.18)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200 bg-white text-rose-500">
                    <MessageSquareMore size={18} />
                  </div>
                  <div>
                    <p className="text-lg font-black tracking-[-0.03em]">
                      {fr ? "Données temporairement indisponibles" : "Data temporarily unavailable"}
                    </p>
                    <p className="text-sm font-medium text-rose-800/80">
                      {error instanceof Error
                        ? error.message
                        : fr
                          ? "Impossible de charger les signalements récents."
                          : "Unable to load recent reports."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <SpotterForm
                fr={fr}
                spotType={spotType}
                setSpotType={setSpotType}
                spotLabel={spotLabel}
                setSpotLabel={setSpotLabel}
                spotLatitude={spotLatitude}
                setSpotLatitude={setSpotLatitude}
                spotLongitude={spotLongitude}
                setSpotLongitude={setSpotLongitude}
                spotNotes={spotNotes}
                setSpotNotes={setSpotNotes}
                spotState={spotState}
                spotMessage={spotMessage}
                onCreateSpot={onCreateSpot}
              />
            )}
          </motion.div>

          <motion.div variants={itemVariants} initial="hidden" animate="visible" className="space-y-6">
            <div id="trash-spotter-map" className="scroll-mt-24 space-y-4">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                      {fr ? "Carte des signalements" : "Reports map"}
                    </h3>
                    <p className="text-sm font-medium text-slate-600">
                      {fr ? "Carte globale des signalements dédiés" : "Global map of Trash Spotter points"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    {fr ? "Filtrer" : "Filter"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {fr ? "En direct" : "Live"}
                  </span>
                </div>
              </div>

              <ActionsMapFeed
                types={["spot"]}
                days={180}
                statusFilter="approved"
                impactFilter="all"
                qualityMin={0}
                presentation="immersive"
                tone="emerald"
                showIntro={false}
                showStoriesCarousel={false}
              />
            </div>

            <div className="rounded-[2rem] border border-emerald-100/90 bg-white/96 p-5 shadow-[0_18px_56px_-38px_rgba(34,197,94,0.22)]">
              <SpotterRecentList fr={fr} recent={quality.recent} />
            </div>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,rgba(247,252,246,0.98),rgba(239,248,236,0.98))] p-6 shadow-[0_18px_56px_-38px_rgba(34,197,94,0.18)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                <Target size={18} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                  {fr ? "Comment ça marche ?" : "How it works"}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  {fr
                    ? "Le signalement alimente la carte globale, le calque dédié, l'itinéraire IA et le rapport d'impact."
                    : "The report feeds the global map, the Trash Spotter layer, AI routing and the impact report."}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: fr ? "Repérer" : "Spot",
                  text: fr ? "Identifier un point visible." : "Identify a visible point.",
                },
                {
                  step: "02",
                  title: fr ? "Signaler" : "Report",
                  text: fr ? "Ajouter une description précise." : "Add a precise description.",
                },
                {
                  step: "03",
                  title: fr ? "Traiter" : "Act",
                  text: fr ? "Prioriser les zones utiles." : "Prioritize useful areas.",
                },
              ].map((step) => (
                <div
                  key={step.step}
                  className="rounded-[1.4rem] border border-emerald-100 bg-white/90 p-4 shadow-sm"
                >
                  <div className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">
                    {step.step}
                  </div>
                  <p className="mt-3 text-sm font-black tracking-[-0.02em] text-slate-950">
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,rgba(242,249,239,0.98),rgba(255,255,255,0.98))] p-6 shadow-[0_18px_56px_-38px_rgba(34,197,94,0.18)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                <ShieldCheck size={18} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                  {fr ? "Modération & géovérification" : "Moderation & geovariation"}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  {fr
                    ? "Chaque signalement est vérifié pour éviter les doublons et sécuriser les données exploitées par les cartes et les rapports."
                    : "Every report is checked to avoid duplicates and secure the data used by maps and reports."}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-emerald-100 bg-white/90 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  {fr ? "Données sécurisées" : "Secured data"}
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                  {fr ? "Confidentielles et protégées." : "Confidential and protected."}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-emerald-100 bg-white/90 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  {fr ? "Impact mesurable" : "Measurable impact"}
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                  {fr ? "Suivi des actions et résultats." : "Actions and results tracking."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-emerald-100 text-emerald-600">
                <Leaf size={28} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
