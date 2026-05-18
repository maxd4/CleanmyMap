"use client";

import { useState } from "react";
import {
  Map as MapIcon,
  Trees,
  Waves,
  Building2,
  TrainFront,
  Landmark,
  Calendar,
  Users,
  Clock,
  Sparkles,
  MapPin,
  User,
  Building,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLACE_TYPE_OPTIONS } from "@/lib/actions/place-type-options";
import { ASSOCIATION_SELECTION_OPTIONS, buildEntrepriseAssociationName } from "@/lib/actions/association-options";
import { OTHER_VOLUNTEER_ASSOCIATION_VALUE } from "./payload";
import type { FormState } from "../action-declaration-form.model";

const PLACE_TYPE_CONFIG: Record<string, { icon: LucideIcon; label: string; sub: string }> = {
  "N° Rue/Allée/Villa/Ruelle/Impasse": { icon: MapIcon,    label: "Voirie",         sub: "Rue, allée, impasse" },
  "Bois/Parc/Jardin/Square/Sentier":   { icon: Trees,      label: "Espace vert",    sub: "Parc, jardin, sentier" },
  "Quai/Pont/Port":                    { icon: Waves,      label: "Pont & Quai",    sub: "Berge, port, pont" },
  "N° Boulevard/Avenue/Place":         { icon: Building2,  label: "Avenue & Place", sub: "Boulevard, place" },
  "Gare/Station/Portique":             { icon: TrainFront, label: "Espace couvert", sub: "Gare, station, portique" },
  "Galerie/Passage couvert":           { icon: Building,   label: "Galerie",        sub: "Passage, galerie" },
  "Monument":                          { icon: Landmark,   label: "Monument",       sub: "Site, monument" },
};

const POPULAR = new Set(["Action spontanée", "Entreprise", "Paris Clean Walk", "World Cleanup Day France", "Wings of the Ocean"]);

const inputCls = "w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all";
const inputErrCls = "border-rose-400 ring-2 ring-rose-400/20 focus:border-rose-400 focus:ring-rose-400/20";

interface Props {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  userMetadata: { displayName?: string; username?: string };
  recordType: FormState["recordType"];
  hasAttemptedSubmit?: boolean;
}

function SectionTitle({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className={cn("h-1 w-6 rounded-full", color)} />
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.18em]">{children}</h3>
    </div>
  );
}

function Field({ icon: Icon, children, className }: { icon: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
        <Icon size={16} />
      </div>
      {children}
    </div>
  );
}

export function ActionStepIdentity({ form, updateField, userMetadata, recordType, hasAttemptedSubmit }: Props) {
  const isCleanPlaceMode = recordType === "clean_place";
  const isEntreprise = form.associationName === "Entreprise" || form.associationName.startsWith("Entreprise - ");
  const isAutreBénévole = form.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE;
  const missingDate = hasAttemptedSubmit && !form.actionDate;
  const missingAssociation = hasAttemptedSubmit && !form.associationName;
  const missingOtherVolunteerName =
    hasAttemptedSubmit && isAutreBénévole && !form.actorName.trim();
  const associationErrorId = "action-association-error";
  const dateErrorId = "action-date-error";
  const otherVolunteerErrorId = "action-other-volunteer-error";

  const [autreBenevoleName, setAutreBenevoleName] = useState(isAutreBénévole ? form.actorName : "");

  function handleAssociationChange(val: string) {
    updateField("associationName", val);
    if (val !== "Entreprise") updateField("enterpriseName", "");
    if (val !== OTHER_VOLUNTEER_ASSOCIATION_VALUE) {
      updateField("actorName", userMetadata.displayName ?? userMetadata.username ?? "");
    }
  }

  function handleAutreBenevoleName(val: string) {
    setAutreBenevoleName(val);
    updateField("actorName", val);
  }

  function handleEntrepriseName(val: string) {
    updateField("enterpriseName", val);
    updateField("associationName", val.trim() ? buildEntrepriseAssociationName(val) : "Entreprise");
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ── 1. Type d'action ─────────────────────────────────────────────── */}
      <div>
        <SectionTitle color="bg-emerald-500">Type d&apos;action</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateField("recordType", "action")}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
              form.recordType === "action" ? "border-emerald-400 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            <div className={cn("h-9 w-9 shrink-0 rounded-xl flex items-center justify-center",
              form.recordType === "action" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
            )}>
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Action terrain</p>
              <p className="text-xs text-slate-500">Collecte mesurable</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateField("recordType", "clean_place")}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
              form.recordType === "clean_place" ? "border-sky-400 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            <div className={cn("h-9 w-9 shrink-0 rounded-xl flex items-center justify-center",
              form.recordType === "clean_place" ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-400"
            )}>
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Lieu propre</p>
              <p className="text-xs text-slate-500">Signalement</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── 2. Cadre & calendrier ────────────────────────────────────────── */}
      <div>
        <SectionTitle color="bg-violet-500">Cadre &amp; calendrier</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Field icon={ChevronDown}>
              <select
                className={cn(inputCls, "appearance-none cursor-pointer", missingAssociation && inputErrCls)}
                value={isAutreBénévole ? OTHER_VOLUNTEER_ASSOCIATION_VALUE : form.associationName}
                onChange={(e) => handleAssociationChange(e.target.value)}
                aria-invalid={missingAssociation}
                aria-describedby={missingAssociation ? associationErrorId : undefined}
              >
                <optgroup label="Fréquents">
                  {[...ASSOCIATION_SELECTION_OPTIONS].filter((o) => POPULAR.has(o)).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                  <option value={OTHER_VOLUNTEER_ASSOCIATION_VALUE}>Autre bénévole</option>
                </optgroup>
                <optgroup label="Associations">
                  {[...ASSOCIATION_SELECTION_OPTIONS].filter((o) => !POPULAR.has(o)).sort().map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </optgroup>
              </select>
            </Field>
            {missingAssociation && (
              <p id={associationErrorId} className="pl-1 text-xs font-medium text-rose-600">
                Sélectionnez une structure ou “Autre bénévole”.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Field icon={Calendar}>
              <input
                type="date"
                className={cn(inputCls, missingDate && inputErrCls)}
                value={form.actionDate}
                onChange={(e) => updateField("actionDate", e.target.value)}
                aria-invalid={missingDate}
                aria-describedby={missingDate ? dateErrorId : undefined}
              />
            </Field>
            {missingDate && (
              <p id={dateErrorId} className="pl-1 text-xs font-medium text-rose-600">
                Indiquez la date de l’action avant de continuer.
              </p>
            )}
          </div>
        </div>

        {isEntreprise && (
          <div className="mt-3 space-y-1">
            <Field icon={Building}>
              <input
                type="text"
                className={inputCls}
                placeholder="Nom de l'entreprise"
                value={form.enterpriseName}
                onChange={(e) => handleEntrepriseName(e.target.value)}
                maxLength={100}
              />
            </Field>
            <p className="text-xs text-slate-400 pl-1">
              Les données seront rattachées à cette entreprise et aux rapports d&apos;impact collectifs.
            </p>
          </div>
        )}

        {isAutreBénévole && (
          <div className="mt-3 space-y-1">
            <Field icon={User}>
              <input
                type="text"
                className={cn(inputCls, missingOtherVolunteerName && inputErrCls)}
                placeholder="Nom ou pseudo du bénévole"
                value={autreBenevoleName}
                onChange={(e) => handleAutreBenevoleName(e.target.value)}
                maxLength={80}
                aria-invalid={missingOtherVolunteerName}
                aria-describedby={
                  missingOtherVolunteerName ? otherVolunteerErrorId : undefined
                }
              />
            </Field>
            {missingOtherVolunteerName ? (
              <p id={otherVolunteerErrorId} className="pl-1 text-xs font-medium text-rose-600">
                Renseignez le nom ou pseudo du bénévole pour éviter une déclaration anonyme.
              </p>
            ) : (
              <p className="text-xs text-slate-400 pl-1">Vous déclarez cette action au nom d&apos;un autre bénévole.</p>
            )}
          </div>
        )}
      </div>

      {!isCleanPlaceMode && (
        <>
          {/* ── 3. Participants & durée ──────────────────────────────────── */}
          <div>
            <SectionTitle color="bg-sky-500">Participants &amp; durée</SectionTitle>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <Field icon={Users}>
                <input
                  type="number"
                  min="1"
                  placeholder="Participants"
                  className={inputCls}
                  value={form.volunteersCount}
                  onChange={(e) => updateField("volunteersCount", e.target.value)}
                />
              </Field>
              <Field icon={Clock}>
                <input
                  type="number"
                  min="1"
                  placeholder="Durée (min)"
                  className={inputCls}
                  value={form.durationMinutes}
                  onChange={(e) => updateField("durationMinutes", e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* ── 4. Environnement de collecte ─────────────────────────────── */}
          <div>
            <SectionTitle color="bg-emerald-500">Environnement de collecte</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {PLACE_TYPE_OPTIONS.map((option) => {
                const cfg = PLACE_TYPE_CONFIG[option] ?? { icon: MapIcon, label: option, sub: "" };
                const Icon = cfg.icon;
                const isSelected = form.placeType === option;
                return (
                  <button
                    key={option}
                    type="button"
                    title={cfg.sub}
                    onClick={() => updateField("placeType", option)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-center transition-all duration-200",
                      isSelected ? "border-emerald-400 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                      isSelected ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className={cn("text-xs font-semibold leading-tight", isSelected ? "text-emerald-800" : "text-slate-600")}>
                        {cfg.label}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5 hidden sm:block">{cfg.sub}</p>
                    </div>
                    {isSelected && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
