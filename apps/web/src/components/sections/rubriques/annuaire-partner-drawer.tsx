"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Globe, Target, Quote, Heart, Zap, ArrowRight, Building2, Sparkles, MessageSquare } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import {
  ENTITY_LABELS,
  CONTRIBUTION_LABELS,
  formatAssociationImpactDate,
  formatCoverage,
  getAssociationImpactSummary,
  getAssociationProfile,
  getAssociationStructureBadge,
} from "./annuaire-helpers";
import { cn } from "@/lib/utils";

interface AnnuairePartnerDrawerProps {
  entry: EnrichedAnnuaireEntry | null;
  isOpen: boolean;
  onClose: () => void;
  fr: boolean;
}

export function AnnuairePartnerDrawer({ entry, isOpen, onClose, fr }: AnnuairePartnerDrawerProps) {
  if (!entry) return null;
  const associationProfile = getAssociationProfile(entry);
  const structureBadge = getAssociationStructureBadge(entry);

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
                <CmmButton
                  onClick={onClose}
                  tone="tertiary"
                  variant="pill"
                  className="rounded-2xl p-4 text-white/60 backdrop-blur-xl transition-all hover:text-white active:scale-90 shadow-2xl"
                >
                  <X size={20} />
                </CmmButton>
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
                  {structureBadge && (
                    <div className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em]",
                      structureBadge.tone === "success"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : structureBadge.tone === "info"
                        ? "border-sky-500/20 bg-sky-500/10 text-sky-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-300",
                    )}>
                      <Sparkles size={12} />
                      {structureBadge.label}
                    </div>
                  )}
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

              {associationProfile && (
                <>
                  <section className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-500">
                        <Heart size={18} />
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{fr ? "Mission associative" : "Association mission"}</h3>
                    </div>
                    <div className="space-y-4 rounded-[2.5rem] border border-white/10 bg-slate-950/40 p-8">
                      <p className="text-lg font-bold leading-relaxed text-slate-200">
                        {associationProfile.mission}
                      </p>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                            Besoins récurrents
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {associationProfile.recurringNeeds.map((need) => (
                              <span key={need} className="rounded-full border border-violet-500/15 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-200">
                                {need}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                            Zones couvertes
                          </p>
                          <p className="mt-3 text-base font-black text-white">
                            {associationProfile.impactHistory?.zonesCovered ?? entry.coveredArrondissements.length} zones
                          </p>
                          <p className="mt-2 text-sm text-slate-400">
                            {formatCoverage(entry.coveredArrondissements, entry.location)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                            Impact local
                          </p>
                          <p className="mt-3 text-base font-black text-white">
                            {getAssociationImpactSummary(entry)}
                          </p>
                          <p className="mt-2 text-sm text-slate-400">
                            {formatAssociationImpactDate(associationProfile.impactHistory?.lastActionAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-500">
                        <Zap size={18} />
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{fr ? "Appels & ressources" : "Calls & resources"}</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                          Appels à contribution
                        </p>
                        <div className="mt-4 space-y-3">
                          {associationProfile.publicCalls.map((call) => (
                            <div key={`${call.type}-${call.label}`} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                              <p className="text-sm font-black text-white">{call.label}</p>
                              {call.detail && (
                                <p className="mt-1 text-xs leading-relaxed text-slate-400">{call.detail}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                          Ressources utiles
                        </p>
                        <div className="mt-4 space-y-3">
                          {associationProfile.usefulResources.length > 0 ? (
                            associationProfile.usefulResources.map((resource) => (
                              <a
                                key={resource.label}
                                href={resource.url || "#"}
                                target={resource.url ? "_blank" : undefined}
                                rel={resource.url ? "noopener noreferrer" : undefined}
                                className={cn(
                                  "block rounded-2xl border border-white/5 bg-slate-950/40 p-4 transition-colors",
                                  resource.url ? "hover:border-violet-500/30 hover:bg-slate-950/60" : "opacity-80",
                                )}
                              >
                                <p className="text-sm font-black text-white">{resource.label}</p>
                                {resource.description && (
                                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{resource.description}</p>
                                )}
                              </a>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-xs text-slate-400">
                              Ressources publiques à compléter
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-500">
                        <ArrowRight size={18} />
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{fr ? "Actions passées" : "Past actions"}</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {associationProfile.pastActions.map((action) => (
                        <div key={action} className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5 text-sm font-semibold leading-relaxed text-slate-200">
                          {action}
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

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
              <CmmButton 
                onClick={onClose}
                tone="tertiary"
                variant="pill"
                className="h-16 flex-1 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-white/10 transition-all"
              >
                {fr ? "Fermer" : "Close"}
              </CmmButton>
              <CmmButton 
                tone="primary"
                variant="default"
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
