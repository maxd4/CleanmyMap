"use client";

import { AlertCircle, Target, Sparkles, MapPin, Search, Info, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { useTrashSpotter } from "./use-trash-spotter";
import { 
  SpotterKpiGrid, 
  SpotterForm, 
  SpotterRecentList, 
  ActionsMapFeed 
} from "./trash-spotter-components";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function TrashSpotterSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const {
    spotType, setSpotType,
    spotLabel, setSpotLabel,
    spotLatitude, setSpotLatitude,
    spotLongitude, setSpotLongitude,
    spotNotes, setSpotNotes,
    spotState, spotMessage,
    onCreateSpot,
    isLoading, error,
    quality,
  } = useTrashSpotter(fr);

  return (
    <SectionShell
      id="trash-spotter"
      title={fr ? "Trash Spotter Engine" : "Trash Spotter Engine"}
      subtitle={fr ? "Signalement rapide et cartographie collaborative des zones à traiter." : "Quick reporting and collaborative mapping of areas to treat."}
      icon={Target}
      gradient="from-amber-500/20 via-orange-500/10 to-transparent"
    >
      <div className="space-y-12 pt-8">
        {/* Header Alert Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[3rem] border border-amber-500/20 bg-amber-500/5 p-8 lg:p-12 backdrop-blur-3xl shadow-2xl flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group"
        >
          <div className="absolute -right-24 -bottom-24 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-2xl shadow-amber-500/10 group-hover:scale-110 transition-transform duration-700">
            <AlertCircle size={44} className="animate-pulse" />
          </div>

          <div className="relative z-10 space-y-4 flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">
              <Sparkles size={12} />
              {fr ? "Engagement Citoyen" : "Citizen Engagement"}
            </div>
            <h3 className="text-3xl font-black text-white tracking-tighter leading-none">
              {fr ? "Identifiez. Signalez. Nettoyez." : "Identify. Report. Clean."}
            </h3>
            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-2xl">
              {fr
                ? "Contribuez à la salubrité de votre territoire en signalant les dépôts sauvages en quelques secondes."
                : "Contribute to the cleanliness of your territory by reporting illegal dumping in seconds."}
            </p>
          </div>
        </motion.div>

        {/* KPI Grid */}
        <AnimatePresence mode="wait">
          {!isLoading && !error && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid"
            >
              <SpotterKpiGrid
                fr={fr}
                total={quality.total}
                pending={quality.pending}
                approved={quality.approved}
                geoCoverage={quality.total > 0 ? `${Math.round((quality.withCoords / quality.total) * 100)}%` : "n/a"}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content: Split Form & Map/Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Side: Form */}
          <motion.div 
            className="lg:col-span-5"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <SpotterForm
              fr={fr}
              spotType={spotType} setSpotType={setSpotType}
              spotLabel={spotLabel} setSpotLabel={setSpotLabel}
              spotLatitude={spotLatitude} setSpotLatitude={setSpotLatitude}
              spotLongitude={spotLongitude} setSpotLongitude={setSpotLongitude}
              spotNotes={spotNotes} setSpotNotes={setSpotNotes}
              spotState={spotState}
              spotMessage={spotMessage}
              onCreateSpot={onCreateSpot}
            />
          </motion.div>

          {/* Right Side: Feed & Map */}
          <div className="lg:col-span-7 space-y-12">
            {isLoading ? (
              <div className="space-y-8">
                <CmmSkeleton className="h-64 w-full rounded-[3rem]" />
                <CmmSkeleton className="h-96 w-full rounded-[3rem]" />
              </div>
            ) : error ? (
              <div className="p-12 rounded-[3rem] border border-rose-500/10 bg-rose-500/5 text-center flex flex-col items-center gap-6">
                <div className="p-4 rounded-full bg-rose-500/10 text-rose-500">
                  <Info size={32} />
                </div>
                <p className="text-xl font-black text-rose-400 tracking-tight">
                  {fr ? "Données temporairement indisponibles" : "Data temporarily unavailable"}
                </p>
              </div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="space-y-12"
              >
                <motion.div variants={itemVariants}>
                  <SpotterRecentList fr={fr} recent={quality.recent} />
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <MapPin size={18} />
                      </div>
                      <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                        {fr ? "Flux Géo-localisé" : "Live Geo-Feed"}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">En direct</span>
                    </div>
                  </div>

                  <div className="rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-slate-900/40 backdrop-blur-3xl min-h-[500px]">
                    <ActionsMapFeed
                      types={["clean_place", "spot"]}
                      days={180}
                      statusFilter="all"
                      impactFilter="all"
                      qualityMin={0}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
