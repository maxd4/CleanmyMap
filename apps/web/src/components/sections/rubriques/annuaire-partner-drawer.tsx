"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Globe, Target, Quote, Heart, Zap, ArrowRight } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import { ENTITY_LABELS, CONTRIBUTION_LABELS } from "./annuaire-helpers";

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
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-[8px] z-[100]"
            onClick={onClose}
          />

          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: "110%", scale: 0.95, opacity: 0 }}
            animate={{ x: 0, scale: 1, opacity: 1 }}
            exit={{ x: "110%", scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-6 bottom-6 right-6 w-full max-w-[550px] bg-slate-950 rounded-[3rem] shadow-[0_48px_96px_-24px_rgba(0,0,0,0.9)] z-[110] flex flex-col overflow-hidden border border-white/5"
          >
            {/* Header with Visual Branding */}
            <div className="relative h-64 flex-shrink-0 overflow-hidden bg-slate-900">
              {/* Abstract Futuristic Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/30 to-transparent" />
              <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[120%] bg-emerald-500/10 blur-[80px] rounded-full" />
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />

              <div className="absolute top-0 right-0 p-10">
                <button
                  onClick={onClose}
                  className="p-4 rounded-full bg-slate-950/40 backdrop-blur-md text-white/60 hover:text-white hover:bg-emerald-500/20 border border-white/10 shadow-2xl transition-all active:scale-95"
                >
                  <X size={24} strokeWidth={3} />
                </button>
              </div>

              <div className="absolute bottom-8 left-10 right-10 flex items-end gap-8">
                <div className="relative group/logo">
                  <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-40 group-hover/logo:opacity-60 transition-opacity" />
                  <div className="relative w-28 h-28 rounded-[2rem] bg-slate-900 shadow-2xl flex items-center justify-center text-5xl font-black cmm-text-primary border border-white/10">
                    {entry.name.charAt(0)}
                  </div>
                </div>
                <div className="pb-2 space-y-2">
                  <div className="inline-flex items-center gap-3">
                    <div className="h-1.5 w-8 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black tracking-[0.3em] text-emerald-500 uppercase">
                      {ENTITY_LABELS[entry.kind] || entry.kind}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black cmm-text-primary leading-[0.95] tracking-tight">{entry.name}</h2>
                </div>
              </div>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar bg-slate-950">
              {/* Mission Overview */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 text-slate-500 border border-slate-800">
                    <Target size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">{fr ? "Impact Stratégique" : "Strategic Impact"}</h3>
                </div>
                <p className="text-lg font-medium text-slate-300 leading-[1.6]">
                  {entry.description}
                </p>
                {entry.featuredReason && (
                  <div className="relative p-8 rounded-[2rem] bg-slate-900 border border-slate-800 shadow-inner group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <Quote size={56} className="absolute -top-2 -right-2 text-emerald-500 opacity-10 group-hover:scale-110 transition-transform" />
                    <p className="cmm-text-body font-bold text-emerald-100 leading-relaxed italic relative z-10">
                      « {entry.featuredReason} »
                    </p>
                  </div>
                )}
              </section>

              {/* Engagement Grid */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 text-slate-400 border border-slate-800">
                    <Zap size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">{fr ? "Leviers d'action" : "Action Levers"}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {entry.contributionTypes.map((type, idx) => (
                    <motion.div 
                      key={type}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      className="flex flex-col gap-3 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all group/item"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover/item:bg-emerald-500 group-hover/item:text-white transition-all">
                        <Heart size={16} strokeWidth={2.5} />
                      </div>
                      <span className="text-sm font-black text-white uppercase tracking-wider">
                        {CONTRIBUTION_LABELS[type] || type}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Location & Tags Overlay */}
              <section className="space-y-6">
                <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group/loc border border-white/5">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 blur-3xl group-hover/loc:scale-150 transition-transform duration-700" />
                  <div className="relative z-10 flex flex-col gap-8">
                    <div className="flex items-start gap-5">
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <MapPin size={28} className="text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black tracking-[0.3em] text-emerald-400 uppercase mb-2">{fr ? "Base Opérationnelle" : "Base of Operations"}</h4>
                        <p className="text-xl font-bold">{entry.location}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {entry.tags?.map(tag => (
                        <span key={tag} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black tracking-widest text-white/40 hover:text-white/70 transition-colors">
                          #{tag.toUpperCase()}
                        </span>
                      ))}
                    </div>

                    <a
                      href={entry.websiteUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-16 rounded-2xl font-black text-lg shadow-[0_12px_40px_rgba(0,0,0,0.8)] border border-emerald-500/20 bg-emerald-600 text-white flex items-center justify-center gap-3 hover:bg-emerald-500 transition-colors"
                    >
                      <Globe size={20} strokeWidth={2.5} />
                      <span>{fr ? "Visiter le site" : "Visit website"}</span>
                    </a>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer Actions */}
            <div className="p-10 border-t border-slate-800/60 bg-slate-950 flex gap-6">
              <CmmButton tone="secondary" variant="ghost" className="flex-1 h-16 rounded-2xl font-black tracking-widest text-xs uppercase" onClick={onClose}>
                {fr ? "Fermer" : "Close"}
              </CmmButton>
              <CmmButton tone="primary" variant="default" className="flex-[2] h-16 rounded-2xl font-black text-lg shadow-[0_12px_32px_rgba(16,185,129,0.3)] group/cta">
                <span>{fr ? "Contacter" : "Contact"}</span>
                <ArrowRight size={22} strokeWidth={3} className="ml-3 group-hover:translate-x-2 transition-transform duration-500" />
              </CmmButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
