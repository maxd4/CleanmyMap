"use client";

import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Trash2, 
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
import { buildActionUpdateHref } from "./action-popup-content.utils";
import {
  formatGeometryConfidenceLabel,
  formatGeometryModeLabel,
  formatGeometryPointCount,
  resolveActionMapGeometryViewModel,
} from "./actions-map-geometry.utils";

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
  const locationLabel = mapItemLocationLabel(item);
  const observedAt = formatObservedDate(
    contract?.dates.observedAt ?? mapItemObservedAt(item),
  );
  const statusLabel = formatStatusLabel(contract?.status ?? item.status);
  const recordTypeLabel = formatRecordType(item);
  const updateHref = buildActionUpdateHref(score, coords);
  const geometryView = resolveActionMapGeometryViewModel(item);
  const geometryConfidenceLabel = formatGeometryConfidenceLabel(
    geometryView.confidence,
  );
  const geometryModeLabel = formatGeometryModeLabel(geometryView.presentation);
  const geometryPointLabel = formatGeometryPointCount(geometryView.pointCount);
  const geometryMetricLabel = geometryView.metrics.label;
  const geometryTone =
    geometry.reality === "real"
      ? {
          shell: "border-emerald-200/70 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300",
          accent: "bg-emerald-500",
          glow: "from-emerald-400/20 via-emerald-500/10 to-transparent",
        }
      : geometry.reality === "estimated"
      ? {
          shell: "border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-300",
          accent: "bg-amber-500",
          glow: "from-amber-400/20 via-amber-500/10 to-transparent",
        }
      : {
          shell: "border-slate-200 bg-slate-50/90 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
          accent: "bg-slate-400",
          glow: "from-slate-400/15 via-slate-500/8 to-transparent",
        };

  return (
    <div className="min-w-[300px] max-w-[340px] overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] dark:border-slate-800/70 dark:bg-slate-950/95 backdrop-blur-xl">
      {/* Header with Visual Score */}
      <div className="relative overflow-hidden p-5 space-y-4">
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${geometryTone.glow}`} />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-slate-200 bg-white/90 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <MapPin size={13} className="cmm-text-secondary" />
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
             <svg className="w-full h-full transform -rotate-90 drop-shadow-sm">
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
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <div className={`w-1.5 h-1.5 rounded-full ${geometryTone.accent} animate-pulse`} />
            <span className="cmm-text-caption font-semibold cmm-text-secondary">
              {statusLabel}
            </span>
          </div>
          {placeType && (
            <span className="rounded-full border border-emerald-200/60 bg-emerald-50/90 px-2.5 py-1 cmm-text-caption font-semibold text-emerald-800 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-300">
              {placeType}
            </span>
          )}
          {quality && (
            <span className="rounded-full border border-sky-200/60 bg-sky-50/90 px-2.5 py-1 cmm-text-caption font-semibold text-sky-800 shadow-sm dark:border-sky-800/50 dark:bg-sky-950/35 dark:text-sky-300">
              {quality}
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-1 cmm-text-caption font-semibold border shadow-sm ${geometryTone.shell}`}
          >
            {geometry.label}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm dark:border-slate-800 dark:from-slate-900/70 dark:to-slate-900/40">
          <div className="flex items-center justify-between gap-3 pb-2">
            <span className="cmm-text-caption font-semibold uppercase tracking-wider cmm-text-muted">
              Géométrie
            </span>
            <span className={`rounded-full border px-2 py-0.5 cmm-text-caption font-semibold shadow-sm ${geometryTone.shell}`}>
              {geometryModeLabel}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 cmm-text-caption font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <span className={`h-1.5 w-1.5 rounded-full ${geometryTone.accent}`} />
              {geometryPointLabel}
            </span>
            {geometryConfidenceLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 cmm-text-caption font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                {geometryConfidenceLabel}
              </span>
            )}
            {geometryMetricLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 cmm-text-caption font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                {geometryMetricLabel}
              </span>
            )}
          </div>
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
        <div className="p-3 rounded-2xl border border-emerald-100/70 bg-gradient-to-br from-emerald-50 to-white shadow-sm dark:border-emerald-800/40 dark:from-emerald-950/20 dark:to-slate-900/30">
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
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/45">
             {associationName && (
               <div className="flex items-center gap-3">
                 <div className="rounded-full bg-indigo-50 p-1.5 text-indigo-600 ring-1 ring-inset ring-indigo-200/60 dark:bg-indigo-900/30 dark:ring-indigo-800/50">
                   <Shield size={14} />
                 </div>
                 <p className="cmm-text-small font-semibold cmm-text-primary">{associationName}</p>
               </div>
             )}
             {(departure || arrival) && (
               <div className="flex items-start gap-3">
                 <div className="mt-0.5 rounded-full bg-sky-50 p-1.5 text-sky-600 ring-1 ring-inset ring-sky-200/60 dark:bg-sky-900/30 dark:ring-sky-800/50">
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
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm group dark:border-slate-800 dark:from-slate-900/70 dark:to-slate-900/30">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
            <p className="cmm-text-caption font-bold uppercase tracking-wider cmm-text-muted mb-2">Bilan terrain</p>
            <p className="cmm-text-small cmm-text-primary leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all">
              &quot;{notes}&quot;
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
        {updateHref ? (
          <a
            href={updateHref}
            className="group relative flex items-center justify-center gap-2 w-full overflow-hidden rounded-2xl bg-slate-900 dark:bg-emerald-600 px-4 py-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-slate-950/10"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-white/10 to-emerald-500/0 translate-x-[-100%] transition-transform duration-1000 group-hover:translate-x-[100%]" />
            <span className="cmm-text-small font-bold text-white">
              {score > 0 ? "Déclarer une action" : "Mettre à jour la zone"}
            </span>
            <ArrowRight size={16} className="text-white/70 transition-transform group-hover:translate-x-1" />
          </a>
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center dark:border-slate-700 dark:bg-slate-800/60">
            <span className="cmm-text-small font-bold text-slate-500 dark:text-slate-300">
              Coordonnées indisponibles
            </span>
            <span className="cmm-text-caption text-slate-400 dark:text-slate-400">
              Le lieu ne peut pas encore être envoyé vers le formulaire d&apos;action.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
