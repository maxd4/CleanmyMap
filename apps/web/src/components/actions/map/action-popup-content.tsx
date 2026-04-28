"use client";

import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Trash2, 
  Info,
  Shield,
  Zap,
  ArrowRight,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { ActionMapItem } from "@/lib/actions/types";
import {
  getActionOperationalContext,
  getGeometryPresentation,
  mapItemCigaretteButts,
  mapItemLocationLabel,
  mapItemObservedAt,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function formatObservedDate(value: string | null | undefined): string {
  if (!value) {
    return "Date non renseignée";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function formatRecordType(item: ActionMapItem): string {
  const type = item.contract?.type ?? "action";

  switch (type) {
    case "action":
      return "Action terrain";
    case "clean_place":
      return "Lieu propre";
    case "spot":
      return "Signalement";
    default:
      return "Action";
  }
}

function formatStatusLabel(status: string | undefined): string {
  switch (status) {
    case "approved":
      return "Validée";
    case "pending":
      return "En attente";
    case "rejected":
      return "Rejetée";
    case "cleaned":
      return "Nettoyée";
    case "validated":
      return "Validée";
    case "new":
      return "Nouveau signalement";
    default:
      return "Statut inconnu";
  }
}

function formatNumber(value: number | null | undefined, suffix = ""): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return `0${suffix}`;
  }
  return `${numeric.toLocaleString("fr-FR")}${suffix}`;
}

export function ActionPopupContent({
  item,
  color,
  score,
  coords,
}: {
  item: ActionMapItem;
  color: string;
  score: number;
  coords: { latitude: number | null; longitude: number | null };
}) {
  const contract = item.contract;
  const geometry = getGeometryPresentation(item);
  const wasteKg = mapItemWasteKg(item) ?? 0;
  const butts = mapItemCigaretteButts(item) ?? 0;
  const volunteers = Number(contract?.metadata.volunteersCount ?? 0);
  const durationMinutes = Number(contract?.metadata.durationMinutes ?? 0);
  const placeType = contract?.metadata.placeType?.trim();
  const associationName = contract?.metadata.associationName?.trim();
  const notes =
    contract?.metadata.notesPlain?.trim() || contract?.metadata.notes?.trim();
  const departure = contract?.metadata.departureLocationLabel?.trim();
  const arrival = contract?.metadata.arrivalLocationLabel?.trim();
  const operational = getActionOperationalContext(contract);
  const quality = item.quality_grade ? `Qualité ${item.quality_grade}` : null;
  const impact = item.impact_level ? `Impact ${item.impact_level}` : null;
  const locationLabel = mapItemLocationLabel(item);
  const observedAt = formatObservedDate(
    contract?.dates.observedAt ?? mapItemObservedAt(item),
  );
  const statusLabel = formatStatusLabel(contract?.status ?? item.status);
  const recordTypeLabel = formatRecordType(item);
  const updateHref =
    score > 0
      ? `/actions/new?lat=${coords.latitude}&lng=${coords.longitude}`
      : `/actions/new?lat=${coords.latitude}&lng=${coords.longitude}&mode=propre`;

  return (
    <div className="min-w-[300px] max-w-[340px] overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
      <TooltipProvider>
      {/* Header with Visual Score */}
      <div className="relative p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <MapPin size={14} className="cmm-text-secondary" />
              </div>
              <p className="cmm-text-caption font-bold uppercase tracking-[0.16em] cmm-text-muted">
                {recordTypeLabel}
              </p>
            </div>
            <h3 className="cmm-text-body font-bold leading-tight cmm-text-primary">
              {locationLabel}
            </h3>
          </div>
          <div className="relative flex-shrink-0 w-14 h-14">
             <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-slate-100 dark:text-slate-800"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="transparent"
                  stroke={color}
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - Math.min(100, score) / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-bold leading-none" style={{ color }}>
                  {Math.round(score)}
                </span>
                <span className="text-[6px] font-bold uppercase tracking-tighter opacity-50">Score</span>
              </div>
          </div>
        </div>

        {/* Status & Badges */}
        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="cmm-text-caption font-semibold cmm-text-secondary">
              {statusLabel}
            </span>
          </div>
          {placeType && (
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 cmm-text-caption font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-800/50">
              {placeType}
            </span>
          )}
          {quality && (
            <span className="rounded-full bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 cmm-text-caption font-semibold text-sky-800 dark:text-sky-300 border border-sky-100/50 dark:border-sky-800/50">
              {quality}
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-1 cmm-text-caption font-semibold border ${
              geometry.reality === "real"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100/50 dark:bg-emerald-900/20 dark:text-emerald-300"
                : geometry.reality === "estimated"
                ? "bg-amber-50 text-amber-800 border-amber-100/50 dark:bg-amber-900/20 dark:text-amber-300"
                : "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/50 dark:text-slate-400"
            }`}
          >
            {geometry.label}
          </span>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-800">
        <div className="bg-white dark:bg-slate-900 p-4 space-y-1">
          <div className="flex items-center gap-2 cmm-text-muted">
            <Trash2 size={12} />
            <span className="cmm-text-caption font-bold uppercase tracking-wider">Déchets</span>
          </div>
          <p className="text-xl font-bold cmm-text-primary tracking-tight">
            {formatNumber(wasteKg)} <span className="cmm-text-caption font-semibold opacity-60">kg</span>
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 space-y-1">
          <div className="flex items-center gap-2 cmm-text-muted">
            <Sparkles size={12} className="text-amber-500" />
            <span className="cmm-text-caption font-bold uppercase tracking-wider">Mégots</span>
          </div>
          <p className="text-xl font-bold cmm-text-primary tracking-tight">
            {formatNumber(butts)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 space-y-1">
          <div className="flex items-center gap-2 cmm-text-muted">
            <Users size={12} />
            <span className="cmm-text-caption font-bold uppercase tracking-wider">Équipe</span>
          </div>
          <p className="text-xl font-bold cmm-text-primary tracking-tight">
            {formatNumber(volunteers)} <span className="cmm-text-caption font-semibold opacity-60">pers.</span>
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 space-y-1">
          <div className="flex items-center gap-2 cmm-text-muted">
            <Clock size={12} />
            <span className="cmm-text-caption font-bold uppercase tracking-wider">Temps</span>
          </div>
          <p className="text-xl font-bold cmm-text-primary tracking-tight">
            {formatNumber(durationMinutes)} <span className="cmm-text-caption font-semibold opacity-60">min</span>
          </p>
        </div>
      </div>

      {/* Details Area */}
      <div className="p-5 space-y-4">
        {/* Engagement Summary */}
        <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-800/40">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-emerald-600" />
                <span className="cmm-text-caption font-bold uppercase text-emerald-700 dark:text-emerald-400">Impact Mobilisation</span>
              </div>
              <span className="cmm-text-small font-bold text-emerald-700 dark:text-emerald-400">
                {operational.engagementHours}h-p
              </span>
           </div>
        </div>

        {/* Association & Routes */}
        {(associationName || departure || arrival) && (
          <div className="space-y-3">
             {associationName && (
               <div className="flex items-center gap-3">
                 <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">
                   <Shield size={14} />
                 </div>
                 <p className="cmm-text-small font-semibold cmm-text-primary">{associationName}</p>
               </div>
             )}
             {(departure || arrival) && (
               <div className="flex items-start gap-3">
                 <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-600 mt-0.5">
                   <ArrowRight size={14} />
                 </div>
                 <div className="cmm-text-caption space-y-0.5">
                   {departure && <p className="cmm-text-secondary"><span className="font-bold">Dép.</span> {departure}</p>}
                   {arrival && <p className="cmm-text-secondary"><span className="font-bold">Arr.</span> {arrival}</p>}
                 </div>
               </div>
             )}
          </div>
        )}

        {/* Bilan / Notes */}
        {notes && (
          <div className="relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 group">
            <p className="cmm-text-caption font-bold uppercase tracking-wider cmm-text-muted mb-2">Bilan terrain</p>
            <p className="cmm-text-small cmm-text-primary leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all">
              "{notes}"
            </p>
          </div>
        )}

        {/* Metadata Footer */}
        <div className="flex items-center justify-between cmm-text-caption pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 cmm-text-muted">
            <Calendar size={12} />
            <span>{observedAt}</span>
          </div>
          <div className="flex items-center gap-1.5 cmm-text-muted">
            <ExternalLink size={12} />
            <span>Source: {contract?.source ?? item.source ?? "n/a"}</span>
          </div>
        </div>

        {/* Primary CTA */}
        <a
          href={updateHref}
          className="group relative flex items-center justify-center gap-2 w-full overflow-hidden rounded-2xl bg-slate-900 dark:bg-emerald-600 px-4 py-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-slate-950/10"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-white/10 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <span className="cmm-text-small font-bold text-white">
            {score > 0 ? "Déclarer une action" : "Mettre à jour la zone"}
          </span>
          <ArrowRight size={16} className="text-white/70 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
      </TooltipProvider>
    </div>
  );
}
