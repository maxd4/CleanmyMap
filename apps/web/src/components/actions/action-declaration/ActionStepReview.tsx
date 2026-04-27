"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, ClipboardCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { CmmButton } from "@/components/ui/cmm-button";
import type { FormState } from "../action-declaration-form.model";
import type { CreateActionPayload } from "@/lib/actions/types";

interface ActionStepReviewProps {
  form: FormState;
  payload: CreateActionPayload;
  dataQuality: { score: number; level: string; warnings: string[] };
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function ActionStepReview({
  form,
  payload,
  dataQuality,
  isSubmitting,
  onSubmit,
}: ActionStepReviewProps) {
  const hasWarnings = dataQuality.warnings.length > 0;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. Quality Score Header */}
      <div className="relative p-10 rounded-[3rem] bg-slate-900 text-white overflow-hidden shadow-2xl">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-10">
          <div className="relative h-32 w-32 shrink-0">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle className="text-white/10" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
              <circle
                className={cn(
                  "transition-all duration-[1.5s] ease-out",
                  dataQuality.score > 70 ? "text-emerald-400" : "text-amber-400"
                )}
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - dataQuality.score / 100)}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black">{dataQuality.score}</span>
              <span className="text-[8px] font-black tracking-widest text-white/40 uppercase">INDICE</span>
            </div>
          </div>

          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <ShieldCheck size={20} className="text-emerald-400" />
              <span className="text-[10px] font-black tracking-[0.3em] text-white/50 uppercase">Analyse de Fiabilité</span>
            </div>
            <h3 className="text-3xl font-black tracking-tighter">Votre déclaration est prête à être transmise</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-md">
              {hasWarnings 
                ? "Nous avons détecté quelques points d'attention qui pourraient impacter la précision de votre impact."
                : "Toutes les données semblent cohérentes. Merci pour cette contribution de qualité au réseau."}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Recap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-6 rounded-full bg-emerald-500" />
            <h4 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">La Récolte</h4>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-slate-50 pb-4">
              <span className="text-sm font-bold text-slate-500">Masse totale</span>
              <span className="text-2xl font-black text-slate-900">{payload.wasteKg} KG</span>
            </div>
            {payload.cigaretteButtsCount && (
              <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                <span className="text-sm font-bold text-slate-500">Mégots identifiés</span>
                <span className="text-xl font-black text-amber-600">{payload.cigaretteButtsCount} U</span>
              </div>
            )}
            <div className="flex justify-between items-end">
              <span className="text-sm font-bold text-slate-500">Participants</span>
              <span className="text-xl font-black text-slate-900">{payload.volunteersCount} PERS.</span>
            </div>
          </div>
        </div>

        <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-6 rounded-full bg-sky-500" />
            <h4 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">Le Contexte</h4>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-slate-50 pb-4">
              <span className="text-sm font-bold text-slate-500">Date</span>
              <span className="text-lg font-black text-slate-900">{payload.actionDate}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-50 pb-4">
              <span className="text-sm font-bold text-slate-500">Structure</span>
              <span className="text-lg font-black text-violet-600 truncate max-w-[200px]">{payload.associationName}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-sm font-bold text-slate-500">Lieu</span>
              <span className="text-lg font-black text-slate-900 truncate max-w-[200px]">{payload.locationLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Warnings if any */}
      {hasWarnings && (
        <div className="p-8 rounded-[2.5rem] bg-amber-50 border border-amber-200 space-y-4">
          <div className="flex items-center gap-3 text-amber-700">
            <AlertTriangle size={20} />
            <span className="text-sm font-black tracking-widest uppercase">Points d'attention suggérés</span>
          </div>
          <ul className="space-y-2">
            {dataQuality.warnings.map((warning, i) => (
              <li key={i} className="flex items-center gap-3 text-xs font-bold text-amber-900/70">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Final Action */}
      <div className="pt-6">
        <CmmButton 
          tone="emerald" 
          variant="solid" 
          size="lg" 
          className="w-full h-20 rounded-[1.5rem] shadow-[0_12px_40px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_50px_rgba(16,185,129,0.4)] transition-all font-black text-xl tracking-tight flex items-center justify-center gap-4 group"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="animate-pulse">Transmission en cours...</span>
          ) : (
            <>
              <ClipboardCheck size={28} />
              <span>Transmettre ma déclaration</span>
              <ArrowRight size={24} className="ml-2 group-hover:translate-x-2 transition-transform duration-500" />
            </>
          )}
        </CmmButton>
      </div>
    </div>
  );
}
