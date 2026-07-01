"use client";

import { useState } from "react";
import {
  Map as MapIcon,
  Trees,
  Waves,
  Building2,
  TrainFront,
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
import { ASSOCIATION_SELECTION_OPTIONS, buildEntrepriseAssociationName } from "@/lib/actions/association-options";
import { OTHER_VOLUNTEER_ASSOCIATION_VALUE } from "./payload";
import type { FormState } from "../action-declaration-form.model";

const PLACE_TYPE_TILE_OPTIONS = [
  {
    values: ["N° Rue/Allée/Villa/Ruelle/Impasse"],
    value: "N° Rue/Allée/Villa/Ruelle/Impasse",
    icon: MapIcon,
    label: "Voirie",
    sub: "Rue, allée, impasse",
  },
  {
    values: ["Bois/Parc/Jardin/Square/Sentier"],
    value: "Bois/Parc/Jardin/Square/Sentier",
    icon: Trees,
    label: "Espace vert",
    sub: "Parc, jardin, sentier",
  },
  {
    values: ["Quai/Pont/Port"],
    value: "Quai/Pont/Port",
    icon: Waves,
    label: "Pont & Quai",
    sub: "Berge, port, pont",
  },
  {
    values: ["N° Boulevard/Avenue/Place"],
    value: "N° Boulevard/Avenue/Place",
    icon: Building2,
    label: "Avenue & Place",
    sub: "Boulevard, place",
  },
  {
    values: ["Gare/Station/Portique"],
    value: "Gare/Station/Portique",
    icon: TrainFront,
    label: "Espace couvert",
    sub: "Gare, station, portique",
  },
  {
    values: ["Galerie/Passage couvert", "Monument"],
    value: "Galerie/Passage couvert",
    icon: Building,
    label: "Galerie & Monument",
    sub: "Passage, galerie, site, monument",
  },
] as const;

const POPULAR = new Set(["Action spontanée", "Entreprise", "Paris Clean Walk", "World Cleanup Day France", "Wings of the Ocean"]);

const inputCls = "w-full h-12 pl-10 pr-4 rounded-xl border border-emerald-200/70 bg-[#F3FBF6] text-sm font-medium text-emerald-950 placeholder:text-emerald-700/35 focus:outline-none focus:ring-2 focus:ring-emerald-500/18 focus:border-emerald-400 transition-all";
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
      <h3 className="text-xs font-bold text-emerald-900/60 uppercase tracking-[0.18em]">{children}</h3>
    </div>
  );
}

function Field({ icon: Icon, children, className }: { icon: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-900/30">
        <Icon size={16} />
      </div>
      {children}
    </div>
  );
}

export function ActionStepIdentity({ form, updateField, userMetadata, recordType, hasAttemptedSubmit }: Props) {
  const isCleanPlaceMode = recordType === "clean_place";
  const isActionMode = recordType === "action";
  const isSpontaneousAction = form.associationName === "Action spontanée";
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
    if (val === "Action spontanée") {
      updateField("organizerAccounts", "");
    }
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <div className="space-y-6">
          <div>
            <SectionTitle color="bg-emerald-500">Type d&apos;action</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateField("recordType", "action")}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
                  form.recordType === "action" ? "border-emerald-300 bg-[#ECF8EF] shadow-sm" : "border-emerald-200/70 bg-[#F3FBF6] hover:border-emerald-300"
                )}
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  form.recordType === "action" ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-700"
                )}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-950">Action terrain</p>
                  <p className="text-xs text-emerald-900/55">Collecte mesurable</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateField("recordType", "clean_place")}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
                  form.recordType === "clean_place" ? "border-sky-300 bg-[#EFFAF3] shadow-sm" : "border-emerald-200/70 bg-[#F3FBF6] hover:border-emerald-300"
                )}
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  form.recordType === "clean_place" ? "bg-sky-500 text-white" : "bg-emerald-100 text-emerald-700"
                )}>
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-950">Lieu propre</p>
                  <p className="text-xs text-emerald-900/55">Signalement</p>
                </div>
              </button>
            </div>
          </div>

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
                  <p id={associationErrorId} className="pl-1 text-xs font-medium text-rose-700">
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
                  <p id={dateErrorId} className="pl-1 text-xs font-medium text-rose-700">
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
                <p className="text-xs text-emerald-900/55 pl-1">
                  Les données seront rattachées à cette entreprise et aux rapports d&apos;impact collectifs.
                </p>
              </div>
            )}

            {isActionMode && !isSpontaneousAction && (
              <div className="mt-3 space-y-1">
                <Field icon={Users}>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Pseudo, nom affiché ou ID, séparés par des virgules"
                    value={form.organizerAccounts}
                    onChange={(e) => updateField("organizerAccounts", e.target.value)}
                    maxLength={300}
                  />
                </Field>
                <p className="text-xs text-emerald-900/55 pl-1">
                  Renseignez les comptes qui ont réellement organisé l&apos;action. La récompense de création sera partagée entre eux si l&apos;action est validée.
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
                  <p id={otherVolunteerErrorId} className="pl-1 text-xs font-medium text-rose-700">
                    Renseignez le nom ou pseudo du bénévole pour éviter une déclaration anonyme.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-900/55 pl-1">Vous déclarez cette action au nom d&apos;un autre bénévole.</p>
                )}
              </div>
            )}

            {isActionMode && (
              <div className="mt-3 rounded-2xl border border-sky-200/70 bg-sky-50/60 p-4 shadow-sm">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                    checked={form.groupJoinEnabled}
                    onChange={(e) => updateField("groupJoinEnabled", e.target.checked)}
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-sky-950">
                      Ouvrir le formulaire de groupe
                    </p>
                    <p className="text-xs leading-relaxed text-sky-900/70">
                      L&apos;organisateur / référant principal et les coorganisateurs peuvent partager le lien. L&apos;action devient rejoignable après validation, et chaque participation est enregistrée séparément.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {!isCleanPlaceMode && (
              <div className="space-y-6 pt-2">
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
              </div>
            )}
          </div>
        </div>

        {!isCleanPlaceMode ? (
          <aside className="space-y-6 self-start xl:sticky xl:top-6">
            <div>
              <SectionTitle color="bg-emerald-500">Environnement de collecte</SectionTitle>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-3">
                {PLACE_TYPE_TILE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = option.values.some((value) => value === form.placeType);
                  return (
                    <button
                      key={option.label}
                      type="button"
                      title={option.sub}
                      onClick={() => updateField("placeType", option.value)}
                      className={cn(
                        "relative flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center transition-all duration-200",
                        isSelected ? "border-emerald-300 bg-[#ECF8EF] shadow-sm" : "border-emerald-200/70 bg-[#F3FBF6] hover:border-emerald-300 hover:bg-[#EAF7EF]"
                      )}
                    >
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                        isSelected ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-700"
                      )}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className={cn("text-[11px] font-semibold leading-tight", isSelected ? "text-emerald-950" : "text-emerald-900/70")}>
                          {option.label}
                        </p>
                        <p className="mt-0.5 hidden text-[10px] leading-tight text-emerald-900/45 sm:block">{option.sub}</p>
                      </div>
                      {isSelected && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
