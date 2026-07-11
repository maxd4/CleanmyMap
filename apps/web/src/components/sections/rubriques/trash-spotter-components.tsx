"use client";

import type { Dispatch, SetStateAction } from "react";
import { memo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Info,
  MapPin,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionMapItem } from "@/lib/actions/types";
import type { SpotFormStatus, SpotType } from "./trash-spotter-types";

type SpotterFormProps = {
  fr: boolean;
  spotType: SpotType;
  setSpotType: Dispatch<SetStateAction<SpotType>>;
  spotLabel: string;
  setSpotLabel: Dispatch<SetStateAction<string>>;
  spotLatitude: string;
  setSpotLatitude: Dispatch<SetStateAction<string>>;
  spotLongitude: string;
  setSpotLongitude: Dispatch<SetStateAction<string>>;
  spotNotes: string;
  setSpotNotes: Dispatch<SetStateAction<string>>;
  spotState: SpotFormStatus;
  spotMessage: string | null;
  onCreateSpot: () => void;
};

type SpotterRecentListProps = {
  fr: boolean;
  recent: ActionMapItem[];
};

const typeButtonClasses = {
  selected: "border-emerald-300/80 bg-emerald-100 text-emerald-950 shadow-[0_20px_40px_-30px_rgba(34,197,94,0.42)]",
  idle: "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900",
} as const;

const statusToneClasses: Record<string, { dot: string; pill: string; label: string }> = {
  approved: {
    dot: "bg-emerald-500",
    pill: "border-emerald-200 bg-emerald-100 text-emerald-800",
    label: "Validé",
  },
  pending: {
    dot: "bg-amber-500",
    pill: "border-amber-200 bg-amber-100 text-amber-800",
    label: "En attente",
  },
  rejected: {
    dot: "bg-rose-500",
    pill: "border-rose-200 bg-rose-100 text-rose-800",
    label: "Refusé",
  },
  default: {
    dot: "bg-slate-400",
    pill: "border-slate-200 bg-slate-100 text-slate-700",
    label: "Publié",
  },
};

function formatRelativeTime(value: string, fr: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fr ? "Récemment" : "Recently";
  }

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat(fr ? "fr" : "en", { numeric: "auto" });

  if (abs < 60) {
    return rtf.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}

function getStatusTone(status?: string | null) {
  return statusToneClasses[status ?? "default"] ?? statusToneClasses["default"];
}

export const SpotterForm = memo(function SpotterForm({
  fr,
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
}: SpotterFormProps) {
  const noteCount = spotNotes.trim().length;
  const isPending = spotState === "pending";
  const isSuccess = spotState === "success";

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-emerald-100/90 bg-white/96 p-6 shadow-[0_24px_64px_-42px_rgba(34,197,94,0.25)] sm:p-7">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300" />
      <div className="absolute right-0 top-0 h-36 w-36 translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/70 blur-3xl" />

      <div className="relative space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-800">
            <PenLine size={12} />
            {fr ? "Nouveau signalement" : "New report"}
          </div>
          <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
            {fr ? "Décrivez le problème et sa localisation." : "Describe the issue and its location."}
          </h3>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-600">
            {fr
              ? "Chaque signalement alimente la carte d'action, l'itinéraire IA et le rapport d'impact."
              : "Every report feeds the action map, the AI route and the impact report."}
          </p>
        </div>

        <div className="space-y-3">
          <label className="ml-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
            {fr ? "Type de signalement" : "Report type"}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                id: "spot" as const,
                title: fr ? "Point de pollution" : "Pollution point",
                description: fr ? "Visible sur la carte globale" : "Visible on the global map",
                icon: Target,
              },
              {
                id: "clean_place" as const,
                title: fr ? "Zone propre" : "Clean place",
                description: fr ? "Référence utile pour le clean zone" : "Reference for the clean-zone flow",
                icon: ShieldCheck,
              },
            ].map((option) => {
              const selected = spotType === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSpotType(option.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-[1.5rem] border px-4 py-3 text-left transition",
                    selected ? typeButtonClasses.selected : typeButtonClasses.idle,
                  )}
                  aria-pressed={selected}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                      selected
                        ? "border-emerald-200 bg-white text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500",
                    )}
                  >
                    <option.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black tracking-[-0.02em]">{option.title}</p>
                    <p className={cn("text-xs font-medium", selected ? "text-emerald-800/70" : "text-slate-500")}>
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <label className="ml-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
            {fr ? "Description" : "Description"}
          </label>
          <input
            type="text"
            value={spotLabel}
            onChange={(event) => setSpotLabel(event.target.value)}
            placeholder={fr ? "Ex: Dépôt sauvage au pied du passage piéton" : "Ex: Waste pile near the crossing"}
            className="h-12 w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
              {fr ? "Localisation" : "Location"}
            </label>
            <input
              type="text"
              value={spotLatitude}
              onChange={(event) => setSpotLatitude(event.target.value)}
              placeholder={fr ? "Latitude" : "Latitude"}
              className="h-12 w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
              {fr ? "Précision" : "Precision"}
            </label>
            <input
              type="text"
              value={spotLongitude}
              onChange={(event) => setSpotLongitude(event.target.value)}
              placeholder={fr ? "Longitude" : "Longitude"}
              className="h-12 w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
              {fr ? "Précisions" : "Notes"}
            </label>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
              {noteCount}/2000
            </span>
          </div>
          <textarea
            value={spotNotes}
            onChange={(event) => setSpotNotes(event.target.value)}
            placeholder={fr ? "Adresse, point de repère, accès, contexte..." : "Address, landmark, access, context..."}
            rows={4}
            maxLength={2000}
            className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <button
            type="button"
            onClick={onCreateSpot}
            disabled={isPending}
            className={cn(
              "inline-flex h-12 items-center justify-center gap-3 rounded-[1.25rem] px-5 text-sm font-black tracking-[0.08em] text-white transition",
              isSuccess
                ? "bg-emerald-500 shadow-[0_18px_38px_-20px_rgba(34,197,94,0.55)]"
                : "bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-[0_18px_38px_-20px_rgba(22,163,74,0.58)] hover:from-emerald-500 hover:to-emerald-400",
              isPending && "cursor-wait opacity-80",
            )}
          >
            {isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                {fr ? "Publication..." : "Publishing..."}
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 size={18} />
                {fr ? "Transmis" : "Sent"}
              </>
            ) : (
              <>
                <Sparkles size={18} />
                {fr ? "Publier le signalement" : "Publish report"}
              </>
            )}
          </button>

          <div className="hidden items-center gap-2 rounded-[1.25rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 sm:inline-flex">
            <MapPin size={16} />
            {fr ? "Alimente la carte globale" : "Feeds the global map"}
          </div>
        </div>

        {spotMessage ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-start gap-2 rounded-[1.25rem] border px-4 py-3 text-sm font-medium",
              spotState === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : spotState === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-50 text-slate-700",
            )}
          >
            <Info size={16} className="mt-0.5 shrink-0" />
            <span>{spotMessage}</span>
          </motion.p>
        ) : null}
      </div>
    </div>
  );
});

export const SpotterRecentList = memo(function SpotterRecentList({
  fr,
  recent,
}: SpotterRecentListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Clock3 size={18} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">
              {fr ? "Signalements récents" : "Recent reports"}
            </h3>
            <p className="text-sm font-medium text-slate-600">
              {fr ? "Dernières contributions reçues" : "Latest contributions received"}
            </p>
          </div>
        </div>

        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">
          {fr ? "En direct" : "Live"}
        </span>
      </div>

      <div className="space-y-3">
        {recent.slice(0, 5).map((spot) => {
          const statusTone = getStatusTone(spot.status);
          return (
            <motion.article
              key={spot.id}
              whileHover={{ y: -2 }}
              className="flex items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.26)]"
            >
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                <MapPin size={18} />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-black tracking-[-0.02em] text-slate-950">
                    {spot.location_label}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                      statusTone.pill,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusTone.dot)} />
                    {statusTone.label}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-600">
                  {formatRelativeTime(spot.action_date, fr)} · {spot.latitude !== null && spot.longitude !== null ? `${spot.latitude.toFixed(4)}, ${spot.longitude.toFixed(4)}` : fr ? "Sans coordonnées" : "No coordinates"}
                </p>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="truncate text-xs font-medium text-slate-500">
                    {spot.location_label}
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full px-0 py-0 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 transition hover:text-emerald-800"
                  >
                    {fr ? "Voir" : "Open"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}

        {recent.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-600">
            {fr ? "Aucun signalement récent pour le moment." : "No recent reports yet."}
          </div>
        ) : null}
      </div>
    </div>
  );
});
