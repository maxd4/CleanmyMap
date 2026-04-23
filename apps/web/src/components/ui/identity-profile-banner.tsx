"use client";

import { useSitePreferences } from "./site-preferences-provider";
import type { AppProfile } from "@/lib/profiles";
import { Info, Microscope, Landmark, ShieldAlert, Users, Layers } from "lucide-react";

const PROFILE_CONTEXT_MESSAGES: Record<AppProfile, string> = {
  benevole: "Interface optimisée pour la déclaration terrain et le suivi de proximité.",
  coordinateur: "Vue de pilotage opérationnel pour la gestion des équipes et événements.",
  scientifique: "Console d'analyse avancée axée sur l'intégrité des données et les statistiques.",
  elu: "Portail de gouvernance avec indicateurs de ROI et impact territorial global.",
  admin: "Espace de supervision système et modération critique.",
};

const PROFILE_ICONS: Record<AppProfile, any> = {
  benevole: Users,
  coordinateur: Layers,
  scientifique: Microscope,
  elu: Landmark,
  admin: ShieldAlert,
};

type IdentityProfileBannerProps = {
  profile: AppProfile;
};

export function IdentityProfileBanner({ profile }: IdentityProfileBannerProps) {
  const { displayMode } = useSitePreferences();
  const Icon = PROFILE_ICONS[profile] || Info;
  
  if (displayMode === "simplifie") return null;

  return (
    <div className="flex items-center gap-4 px-6 py-4 bg-slate-900/[0.03] border border-slate-200/60 rounded-2xl mb-8 group transition-all hover:bg-white hover:shadow-md hover:border-slate-300">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-emerald-500 group-hover:scale-110 transition-transform" style={{ color: 'rgb(var(--profile-primary))' }}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Expérience de navigation</p>
        <p className="text-sm font-bold text-slate-800 leading-tight mt-1">
          {PROFILE_CONTEXT_MESSAGES[profile]}
        </p>
      </div>
      <div className="hidden sm:block text-right">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type de vue</p>
        <p className="text-[11px] font-black text-slate-600 uppercase mt-0.5" style={{ color: 'rgb(var(--profile-primary))' }}>
          {profile} (Optimisé)
        </p>
      </div>
    </div>
  );
}
