"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Globe, Target, Quote, Heart, Zap, ArrowRight, Building2, Sparkles, MessageSquare } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import { ENTITY_LABELS, CONTRIBUTION_LABELS } from "./annuaire-helpers";
import { cn } from "@/lib/utils";

interface AnnuairePartnerDrawerProps {
  entry: EnrichedAnnuaireEntry | null;
  isOpen: boolean;
  onClose: () => void;
  fr: boolean;
}

export function AnnuairePartnerDrawer({ entry, isOpen, onClose, fr }: AnnuairePartnerDrawerProps) {
  if (!entry) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with progressive blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-[12px]"
            onClick={onClose}
          />

          {/* Slide-over Panel - Premium Glass Architecture */}
          <motion.div
            initial={{ x: "110%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "110%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="fixed top-4 bottom-4 right-4 z-[110] flex w-full max-w-[550px] flex-col overflow-hidden rounded-[3.5rem] border border-white/10 bg-slate-900/60 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)]"
          >
            {/* Header with Visual Branding */}
            <div className="relative h-72 flex-shrink-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-indigo-600/10 to-transparent" />
              <div className="absolute top-[-20%] right-[-10%] h-[120%] w-[80%] rounded-full bg-violet-500/10 blur-[100px]" />
              
              <div className="absolute top-8 right-8 z-20">
                <button
                  onClick={onClose}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-white/60 backdrop-blur-xl transition-all hover:bg-white/10 hover:text-white active:scale-90 shadow-2xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="absolute bottom-10 left-10 right-10 flex items-end gap-8 z-10">
                <div className="relative group/logo">
                  <div className="absolute inset-0 bg-violet-400 blur-2xl opacity-20 transition-opacity group-hover/logo:opacity-40" />
                  <div className="relative flex h-28 w-28 items-center justify-center rounded-[2.5rem] border border-white/10 bg-slate-950/60 text-5xl font-black text-white shadow-2xl backdrop-blur-3xl">
                    {entry.name.charAt(0)}
                  </div>
                </div>
                <div className="pb-2 space-y-3">
                  <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[9px] font-black uppercase tracking-[0.3em] text-violet-400">
                    <Building2 size={12} />
                    {ENTITY_LABELS[entry.kind] || entry.kind}
                  </div>
                  <h2 className="text-4xl font-black leading-tight tracking-tighter text-white">{entry.name}</h2>
                </div>
              </div>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 space-y-12 overflow-y-auto p-10 custom-scrollbar">
              {/* Mission Overview */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-500">
                    <Target size={18} />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{fr ? "Mission & Impact" : "Mission & Impact"}</h3>
                </div>
                <p className="text-lg font-bold leading-relaxed text-slate-300 opacity-90">
                  {entry.description}
                </p>
                {entry.featuredReason && (
                  <div className="group relative overflow-hidden rounded-[2.5rem] border border-violet-500/20 bg-violet-500/5 p-8 shadow-inner">
                    <div className="absolute top-0 left-0 h-full w-1.5 bg-violet-500" />
                    <Quote size={60} className="absolute -top-4 -right-4 text-violet-400 opacity-10 transition-transform group-hover:scale-110" />
                    <p className="relative z-10 text-base font-black italic leading-relaxed text-violet-100/80">
                      « {entry.featuredReason} »
                    </p>
                  </div>
                )}
              </section>

              {/* Engagement Grid */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-500">
                    <Zap size={18} />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{fr ? "Champs d'intervention" : "Areas of intervention"}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {entry.contributionTypes.map((type, idx) => (
                    <motion.div 
                      key={type}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      className="group/item flex flex-col gap-4 rounded-[2rem] border border-white/5 bg-white/5 p-6 shadow-2xl transition-all hover:bg-white/10 hover:border-violet-500/30"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/40 text-slate-500 transition-all group-hover/item:bg-violet-500 group-hover/item:text-white">
                        <Heart size={16} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-white/70 group-hover/item:text-white">
                        {CONTRIBUTION_LABELS[type] || type}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Base Location & Network */}
              <section className="space-y-6">
                <div className="group/loc relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950/40 p-8 text-white shadow-2xl">
                  <div className="absolute top-0 right-0 h-40 w-40 bg-violet-600/10 blur-3xl transition-transform duration-1000 group-hover/loc:scale-150" />
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-start gap-5">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-violet-400">
                        <MapPin size={24} />
                      </div>
                      <div>
                        <h4 className="mb-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">{fr ? "Ancrage Territorial" : "Territorial Base"}</h4>
                        <p className="text-xl font-black tracking-tight">{entry.location}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {entry.tags?.map(tag => (
                        <span key={tag} className="rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-[10px] font-black tracking-widest text-slate-500 transition-colors hover:text-white hover:border-violet-500/20">
                          {tag.toUpperCase()}
                        </span>
                      ))}
                    </div>

                    <a
                      href={entry.websiteUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-white text-slate-950 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <Globe size={18} />
                      <span>{fr ? "Consulter le site" : "Visit website"}</span>
                    </a>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer Navigation */}
            <div className="flex gap-4 border-t border-white/5 bg-slate-950/40 p-10 backdrop-blur-3xl">
              <button 
                onClick={onClose}
                className="h-16 flex-1 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-white/10 transition-all"
              >
                {fr ? "Fermer" : "Close"}
              </button>
              <CmmButton 
                variant="primary"
                className="group/cta h-16 flex-[2] rounded-2xl bg-violet-600 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_rgba(139,92,246,0.3)] transition-all hover:bg-violet-500 hover:scale-[1.02]"
              >
                <span>{fr ? "Engager le contact" : "Get in touch"}</span>
                <MessageSquare size={18} className="ml-3 group-hover/cta:scale-110 transition-transform" />
              </CmmButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
