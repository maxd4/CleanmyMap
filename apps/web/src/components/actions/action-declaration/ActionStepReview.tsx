"use client";

import {
  AlertTriangle,
  ShieldCheck,
  ClipboardCheck,
  Loader2,
  Trash2,
  Route,
  CalendarDays,
  Building2,
  MapPin,
  Users,
  Cigarette,
  Info,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CmmButton } from "@/components/ui/cmm-button";
import type { CreateActionPayload } from "@/lib/actions/types";
import type { ActionDataQualityResult } from "../action-declaration-form.quality";
import {
  formatGeometryPointCount,
  summarizeActionDrawingValidation,
} from "../map/actions-map-geometry.utils";

interface ActionStepReviewProps {
  payload: CreateActionPayload;
  dataQuality: ActionDataQualityResult;
  isSubmitting: boolean;
  onSubmit: () => void;
  showSubmitButton?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtKg(v: number | undefined | null): string {
  if (v == null || !Number.isFinite(v)) return "Non renseigné";
  return `${v < 1 ? v.toFixed(2) : v.toFixed(1)} kg`.replace(".", ",");
}

function fmtDate(iso: string): string {
  if (!iso) return "Non renseignée";
  try {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtAssociation(name: string | undefined): string {
  if (!name || name.trim() === "" || name === "Entreprise -") return "Non renseignée";
  return name;
}

function fmtLocation(label: string | undefined): string {
  return label?.trim() || "Non renseigné";
}

function qualityLabel(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 80) return { label: "Excellent", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (score >= 55) return { label: "Bon", color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200" };
  if (score >= 35) return { label: "Moyen", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" };
  return { label: "Faible", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className={cn("h-1 w-5 rounded-full", color)} />
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-[0.18em]">{children}</h4>
    </div>
  );
}

function DataRow({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueClass?: string;
}) {
  const isEmpty = value === "Non renseigné" || value === "Non renseignée";
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 text-slate-500 shrink-0">
        <Icon size={13} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className={cn(
        "text-sm font-semibold text-right truncate max-w-[55%]",
        isEmpty ? "text-slate-300 italic" : (valueClass ?? "text-slate-900")
      )}>
        {value}
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ActionStepReview({
  payload,
  dataQuality,
  isSubmitting,
  onSubmit,
  showSubmitButton = true,
}: ActionStepReviewProps) {
  const isCleanPlaceMode =
    payload.recordType === "clean_place" || payload.recordType === "spot";
  const hasWarnings = dataQuality.warnings.length > 0;
  const drawingSummary = summarizeActionDrawingValidation(payload.manualDrawing ?? null);
  const quality = qualityLabel(dataQuality.score);

  const readyMessage = hasWarnings
    ? "Déclaration transmissible — certains éléments peuvent être améliorés."
    : isCleanPlaceMode
      ? "Le lieu propre est cohérent et prêt à être publié."
      : "Toutes les données semblent cohérentes. Merci pour cette contribution.";

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ── 1. Score de fiabilité ────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SectionTitle color="bg-emerald-500">Analyse de fiabilité</SectionTitle>

        <div className="flex items-center gap-5">
          {/* Cercle score */}
          <div className="relative h-20 w-20 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                strokeWidth="9"
                stroke="#f1f5f9"
                fill="transparent"
                r="40" cx="50" cy="50"
              />
              <circle
                strokeWidth="9"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - dataQuality.score / 100)}
                strokeLinecap="round"
                stroke={dataQuality.score >= 55 ? "#10b981" : dataQuality.score >= 35 ? "#f59e0b" : "#f43f5e"}
                fill="transparent"
                r="40" cx="50" cy="50"
                className="transition-all duration-[1.2s] ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-900">{dataQuality.score}</span>
              <span className="text-[9px] font-bold text-slate-400">/100</span>
            </div>
          </div>

          {/* Texte */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold",
                quality.bg, quality.border, quality.color
              )}>
                {quality.label}
              </span>
              <span className="text-xs text-slate-400">Niveau {dataQuality.level}</span>
            </div>
            <p className="text-sm font-medium text-slate-700 leading-snug">{readyMessage}</p>
          </div>
        </div>
      </section>

      {/* ── 2. Cartes résumé ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

        {/* Récolte */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle color="bg-emerald-500">La récolte</SectionTitle>
          {isCleanPlaceMode ? (
            <>
              <DataRow icon={MapPin} label="Type" value="Lieu propre" />
              <DataRow icon={MapPin} label="Lieu" value={fmtLocation(payload.locationLabel)} />
              <DataRow icon={ClipboardCheck} label="Photos" value={`${payload.photos?.length ?? 0} photo(s)`} />
            </>
          ) : (
            <>
              <DataRow icon={Trash2} label="Déchets" value={fmtKg(payload.wasteKg)} valueClass="text-emerald-700 font-bold" />
              <DataRow icon={Cigarette} label="Mégots" value={fmtKg(payload.wasteBreakdown?.megotsKg)} valueClass="text-amber-700" />
              <DataRow icon={Users} label="Participants" value={payload.volunteersCount > 0 ? `${payload.volunteersCount} personne${payload.volunteersCount > 1 ? "s" : ""}` : "Non renseigné"} />
            </>
          )}
        </section>

        {/* Localisation */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle color="bg-sky-500">La localisation</SectionTitle>
          {payload.manualDrawing ? (
            <>
              <DataRow
                icon={Route}
                label="Type"
                value={payload.manualDrawing.kind === "polygon" ? "Zone libre" : "Repère ajusté"}
              />
              <DataRow
                icon={MapPin}
                label="Points"
                value={formatGeometryPointCount(drawingSummary.pointCount)}
              />
              <DataRow
                icon={CheckCircle2}
                label="Statut"
                value="Localisation validée"
                valueClass="text-emerald-700"
              />
            </>
          ) : payload.departureLocationLabel ? (
            <>
              <DataRow icon={MapPin} label="Lieu" value={fmtLocation(payload.departureLocationLabel)} />
              <DataRow icon={Route} label="Complément" value={fmtLocation(payload.arrivalLocationLabel)} />
              <DataRow icon={Info} label="Précision" value="Aperçu automatique" valueClass="text-amber-600" />
            </>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800">Aucune localisation détaillée</p>
              <p className="text-xs text-amber-700">
                L&apos;envoi reste possible. Vous pouvez revenir à l&apos;étape Localisation pour ajouter des précisions.
              </p>
            </div>
          )}
        </section>

        {/* Contexte */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle color="bg-violet-500">Le contexte</SectionTitle>
          <DataRow
            icon={CalendarDays}
            label="Date"
            value={fmtDate(payload.actionDate)}
          />
          <DataRow
            icon={Building2}
            label="Structure"
            value={fmtAssociation(payload.associationName)}
            valueClass="text-violet-700"
          />
          {payload.recordType === "action" && (
            <DataRow
              icon={Users}
              label="Organisateur / Référant ayant participé à l'action"
              value={
                payload.associationName === "Action spontanée"
                  ? "Compte connecté automatiquement"
                  : payload.organizerAccounts && payload.organizerAccounts.length > 0
                    ? payload.organizerAccounts.join(", ")
                    : "Compte admin par défaut"
              }
              valueClass="text-violet-700"
            />
          )}
          <DataRow
            icon={MapPin}
            label="Lieu"
            value={fmtLocation(payload.locationLabel)}
          />
        </section>
      </div>

      {/* ── 3. Points d'attention ────────────────────────────────────────── */}
      {hasWarnings && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">
              Points d&apos;attention ({dataQuality.warnings.length})
            </h4>
          </div>
          <ul className="space-y-2">
            {dataQuality.warnings.map((warning, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-white px-3 py-2.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <p className="text-xs text-slate-700 leading-relaxed">{warning}</p>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-amber-700">
            Ces points n&apos;empêchent pas l&apos;envoi. Ils améliorent la fiabilité de votre déclaration.
          </p>
        </section>
      )}

      {/* ── 4. Bouton final ──────────────────────────────────────────────── */}
      {showSubmitButton && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 shrink-0 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ShieldCheck size={15} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {isCleanPlaceMode ? "Dernière vérification" : "Dernière vérification"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Ce bouton ouvre une confirmation. Rien n&apos;est envoyé tant que vous ne confirmez pas.
              </p>
            </div>
          </div>

          <CmmButton
            tone="primary"
            variant="default"
            size="md"
            className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Envoi en cours…
              </>
            ) : (
              <>
                <ClipboardCheck size={16} />
                {isCleanPlaceMode ? "Vérifier avant envoi" : "Vérifier avant envoi"}
              </>
            )}
          </CmmButton>
        </section>
      )}

    </div>
  );
}
