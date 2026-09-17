import {
  ArrowRight,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { formatNumber } from "./action-popup-content.helpers";
import { SignalementMediaProofs } from "@/components/actions/signalement-media/signalement-media-proofs";

type ActionPopupContentBodyProps = {
  wasteKg: number;
  butts: number;
  volunteers: number;
  durationMinutes: number;
  operationalEngagementHours: number;
  associationName: string | null;
  departure: string | null;
  arrival: string | null;
  notes: string | null;
  observedAt: string;
  sourceLabel: string;
  updateHref: string | null;
  joinHref?: string | null;
  joinStatusLabel?: string | null;
  hasPollution: boolean;
  isAction: boolean;
  signalementId?: string | null;
  onViewGeometry?: () => void;
  geometryKind?: "polyline" | "polygon" | "point" | null;
  compact?: boolean;
};

export function ActionPopupContentBody({
  wasteKg,
  butts,
  volunteers,
  durationMinutes,
  operationalEngagementHours,
  associationName,
  departure,
  arrival,
  notes,
  observedAt,
  sourceLabel,
  updateHref,
  joinHref,
  joinStatusLabel,
  hasPollution,
  isAction,
  signalementId = null,
  onViewGeometry,
  geometryKind,
  compact = false,
}: ActionPopupContentBodyProps) {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const wasteLabel = compact || !isAction ? "Déchets" : "Déchets collectés";
  const buttsLabel = compact || !isAction ? "Mégots" : "Mégots collectés";
  const actionLabel = isAction
    ? "Nouvelle action ici"
    : hasPollution
      ? "Déclarer une action"
      : "Mettre à jour l’état du lieu";
  const metricCellClass = compact
    ? "space-y-0.5 bg-white p-2.5 dark:bg-slate-900"
    : "space-y-1 bg-white p-4 dark:bg-slate-900";
  const metricLabelClass = compact
    ? "text-xs font-semibold"
    : "cmm-text-caption font-bold uppercase tracking-wider";
  const metricValueClass = compact
    ? "text-lg font-bold tracking-tight text-slate-950"
    : "text-xl font-bold tracking-tight text-slate-950";

  return (
    <div className={compact ? "space-y-3 p-4" : "space-y-4 p-5"}>
      <div className={compact
        ? "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800"
        : "grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800"}>
        <div className={metricCellClass}>
          <div className="flex items-center gap-2 text-slate-600">
            <Trash2 size={12} />
            <span className={metricLabelClass}>{wasteLabel}</span>
          </div>
          <p className={metricValueClass}>
            {formatNumber(wasteKg)}{" "}
            <span className="cmm-text-caption font-semibold text-slate-500">kg</span>
          </p>
        </div>
        <div className={metricCellClass}>
          <div className="flex items-center gap-2 text-slate-600">
            <Sparkles size={12} className="text-amber-500" />
            <span className={metricLabelClass}>{buttsLabel}</span>
          </div>
          <p className={metricValueClass}>{formatNumber(butts)}</p>
        </div>
        <div className={metricCellClass}>
          <div className="flex items-center gap-2 text-slate-600">
            <Users size={12} />
            <span className={metricLabelClass}>Équipe</span>
          </div>
          <p className={metricValueClass}>
            {formatNumber(volunteers)}{" "}
            <span className="cmm-text-caption font-semibold text-slate-500">pers.</span>
          </p>
        </div>
        <div className={metricCellClass}>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock size={12} />
            <span className={metricLabelClass}>Temps</span>
          </div>
          <p className={metricValueClass}>
            {formatNumber(durationMinutes)}{" "}
            <span className="cmm-text-caption font-semibold text-slate-500">min</span>
          </p>
        </div>
      </div>

      <div className={compact
        ? "rounded-xl border border-emerald-100/70 bg-gradient-to-br from-emerald-50 to-white p-2.5 shadow-sm dark:border-emerald-800/40 dark:from-emerald-950/20 dark:to-slate-900/30"
        : "rounded-2xl border border-emerald-100/70 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-sm dark:border-emerald-800/40 dark:from-emerald-950/20 dark:to-slate-900/30"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-emerald-600" />
            <span className={compact
              ? "text-xs font-semibold text-emerald-700 dark:text-emerald-400"
              : "cmm-text-caption font-bold uppercase text-emerald-700 dark:text-emerald-400"}>
              {compact ? "Mobilisation" : "Impact Mobilisation"}
            </span>
          </div>
          <span className="cmm-text-small font-bold text-emerald-700 dark:text-emerald-400">
            {formatNumber(operationalEngagementHours)}h-p
          </span>
        </div>
      </div>

      {(associationName || departure || arrival) && (
        <div className={compact
          ? "space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/45"
          : "space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/45"}>
          {associationName && (
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-50 p-1.5 text-indigo-600 ring-1 ring-inset ring-indigo-200/60 dark:bg-indigo-900/30 dark:ring-indigo-800/50">
                <Shield size={14} />
              </div>
              <p className="cmm-text-small font-semibold text-slate-950">{associationName}</p>
            </div>
          )}
          {(departure || arrival) && (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-sky-50 p-1.5 text-sky-600 ring-1 ring-inset ring-sky-200/60 dark:bg-sky-900/30 dark:ring-sky-800/50">
                <ArrowRight size={14} />
              </div>
              <div className="cmm-text-caption space-y-0.5">
                {departure && (
                  <p className="text-slate-700">
                    <span className="font-bold">Dép.</span> {departure}
                  </p>
                )}
                {arrival && (
                  <p className="text-slate-700">
                    <span className="font-bold">Arr.</span> {arrival}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {notes && (
        <div className={compact
          ? "relative overflow-hidden rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm dark:border-slate-800 dark:from-slate-900/70 dark:to-slate-900/30"
          : "relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900/70 dark:to-slate-900/30"}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
          <p className={compact ? "mb-1.5 text-xs font-semibold cmm-text-muted" : "mb-2 cmm-text-caption font-bold uppercase tracking-wider cmm-text-muted"}>
            Bilan terrain
          </p>
          <p
            id="action-popup-notes"
            className={`cmm-text-small text-slate-800 italic ${
              isNotesExpanded ? "leading-relaxed" : "line-clamp-3"
            }`}
          >
            &quot;{notes}&quot;
          </p>
          <button
            type="button"
            className="mt-2 min-h-9 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-sky-700 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 dark:text-sky-300 dark:hover:text-sky-100"
            aria-expanded={isNotesExpanded}
            aria-controls="action-popup-notes"
            onClick={() => setIsNotesExpanded((expanded) => !expanded)}
          >
            {isNotesExpanded ? "Réduire" : "Voir plus"}
          </button>
        </div>
      )}

      {signalementId ? <SignalementMediaProofs signalementId={signalementId} /> : null}

      <div className={compact
        ? "flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800"
        : "flex items-center justify-between border-t border-slate-100 pt-2 cmm-text-caption dark:border-slate-800"}>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Calendar size={12} />
          <span>{observedAt}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <ExternalLink size={12} />
          <span>{sourceLabel}</span>
        </div>
      </div>

      {isAction ? (
        <CmmButton
          href="/reports"
          tone="critical"
          variant="pill"
          className="min-h-11 w-full justify-center gap-2 px-4 py-2.5 text-xs font-semibold"
        >
          <FileText size={15} />
          Générer le rapport d&apos;impact
          <ArrowRight size={15} />
        </CmmButton>
      ) : null}

      {updateHref ? (
        <CmmButton
          href={updateHref}
          tone="secondary"
          width="wide"
          className={compact
            ? "group relative min-h-11 overflow-hidden rounded-xl bg-sky-200 px-4 py-3 text-center shadow-lg shadow-slate-950/10"
            : "group relative overflow-hidden rounded-2xl bg-sky-200 px-4 py-4 text-center shadow-lg shadow-slate-950/10"}
        >
          <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-emerald-500/0 via-white/10 to-emerald-500/0 transition-transform duration-1000 motion-reduce:transition-none group-hover:translate-x-[100%]" />
          <span className="cmm-text-small font-bold text-slate-950">
            {actionLabel}
          </span>
          <ArrowRight size={16} className="text-slate-700 transition-transform motion-reduce:transition-none group-hover:translate-x-1" />
        </CmmButton>
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
      {joinHref || joinStatusLabel || onViewGeometry ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {joinHref ? (
            <CmmButton
              href={joinHref}
              tone="secondary"
              variant="ghost"
              size="sm"
              className="min-h-11 max-w-full px-3 text-xs font-semibold"
            >
              Rejoindre une action
            </CmmButton>
          ) : joinStatusLabel ? (
            <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center dark:border-slate-700 dark:bg-slate-800/60">
              <span className="cmm-text-small font-bold text-slate-600 dark:text-slate-200">
                {joinStatusLabel}
              </span>
              <span className="mt-1 block cmm-text-caption text-slate-400 dark:text-slate-400">
                Le partage de ce formulaire est désactivé côté organisateur.
              </span>
            </div>
          ) : null}
          {onViewGeometry ? (
            <CmmButton
              type="button"
              onClick={onViewGeometry}
              tone="tertiary"
              variant="ghost"
              size="sm"
              className="min-h-11 max-w-full px-3 text-xs font-semibold"
            >
              {geometryKind === "polygon"
                ? "Voir toute la zone"
                : "Voir tout le parcours"}
            </CmmButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
