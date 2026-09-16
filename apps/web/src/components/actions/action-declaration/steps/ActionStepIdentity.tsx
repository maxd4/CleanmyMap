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
  User,
  Building,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import {
  deriveEventDurationMinutes,
  deriveOrganizationMinutes,
} from "@/lib/actions/time-contract";
import { cn } from "@/lib/utils";
import {
  ENTREPRISE_ASSOCIATION_OPTION,
  buildEntrepriseAssociationName,
  extractEntrepriseName,
  getOrganizerDirectoryEntries,
  getOrganizerDirectoryEntryByValue,
  getOrganizerDirectoryLocationLabel,
  isAssociationSelectionOption,
  isOrganizerAssociationNameCompatible,
} from "@/lib/actions/association-options";
import { ORGANIZER_TYPE_OPTIONS } from "@/lib/actions/organizer-type";
import { OTHER_VOLUNTEER_ASSOCIATION_VALUE } from "../payload";
import type { FormState } from "../form/model";
import { ActionParticipantPicker } from "../../action-participant-picker";
import {
  formatBusinessDurationMinutes,
} from "@/lib/actions/time-contract";
import { normalizeVolunteerParticipation } from "@/lib/actions/volunteer-participation";

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

const inputCls = "w-full h-12 pl-10 pr-4 rounded-xl border border-emerald-200/70 bg-[#F3FBF6] text-sm font-medium text-emerald-950 placeholder:text-emerald-700/35 focus:outline-none focus:ring-2 focus:ring-emerald-500/18 focus:border-emerald-400 transition-all";
const inputErrCls = "border-rose-400 ring-2 ring-rose-400/20 focus:border-rose-400 focus:ring-rose-400/20";

interface Props {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  updateFields: (updates: Partial<FormState>) => void;
  userMetadata: { userId: string; displayName?: string; username?: string };
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

export function ActionStepIdentity({ form, updateField, updateFields, userMetadata, recordType, hasAttemptedSubmit }: Props) {
  const isActionMode = recordType === "action";
  const isSpontaneousAction = form.organizerType === "spontaneous";
  const isEntreprise =
    form.organizerType === "company" ||
    form.associationName === ENTREPRISE_ASSOCIATION_OPTION ||
    form.associationName.startsWith("Entreprise - ");
  const isAutreBénévole = form.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE;
  const directoryEntries = getOrganizerDirectoryEntries(form.organizerType);
  const currentDirectoryEntry = getOrganizerDirectoryEntryByValue(form.associationName);
  const currentLegacyAssociation =
    form.organizerType !== "company" &&
    !currentDirectoryEntry &&
    isAssociationSelectionOption(form.associationName) &&
    isOrganizerAssociationNameCompatible(form.organizerType, form.associationName)
      ? form.associationName
      : null;
  const structureSelectValue =
    form.organizerType === "company" && currentDirectoryEntry?.organizerType !== "company"
      ? ""
      : form.associationName;
  const missingDate = hasAttemptedSubmit && !form.actionDate;
  const missingAssociation = hasAttemptedSubmit && !form.associationName;
  const missingOrganizerType = hasAttemptedSubmit && isActionMode && !form.organizerType;
  const missingOtherVolunteerName =
    hasAttemptedSubmit && isAutreBénévole && !form.actorName.trim();
  const associationErrorId = "action-association-error";
  const organizerTypeErrorId = "action-organizer-type-error";
  const dateErrorId = "action-date-error";
  const otherVolunteerErrorId = "action-other-volunteer-error";
  const event = deriveEventDurationMinutes(form.eventStartTime, form.eventEndTime);
  const organization = deriveOrganizationMinutes({
    actionDurationMinutes: Number(form.durationMinutes),
    eventDurationMinutes: event.eventDurationMinutes,
  });
  const volunteerParticipation = normalizeVolunteerParticipation({
    childrenCount: form.childrenCount.trim() === "" ? null : Number(form.childrenCount),
    adultCount: form.adultCount.trim() === "" ? null : Number(form.adultCount),
    retiredCount: form.retiredCount.trim() === "" ? null : Number(form.retiredCount),
  });

  const [autreBenevoleName, setAutreBenevoleName] = useState(isAutreBénévole ? form.actorName : "");

  function handleAssociationChange(val: string) {
    const nextAssociationName =
      form.organizerType === "company" && !val
        ? ENTREPRISE_ASSOCIATION_OPTION
        : val;
    updateFields({
      associationName: nextAssociationName,
      enterpriseName:
        form.organizerType === "company"
          ? extractEntrepriseName(nextAssociationName) ?? ""
          : "",
      ...(nextAssociationName !== OTHER_VOLUNTEER_ASSOCIATION_VALUE
        ? { actorName: userMetadata.displayName ?? userMetadata.username ?? "" }
        : {}),
    });
  }

  function handleOrganizerTypeChange(nextType: FormState["organizerType"]) {
    const keepsCurrentAssociation = isOrganizerAssociationNameCompatible(
      nextType,
      form.associationName,
    );
    const nextAssociationName =
      nextType === "spontaneous"
        ? "Action spontanée"
        : keepsCurrentAssociation
          ? form.associationName
          : "";

    updateFields({
      organizerType: nextType,
      associationName: nextAssociationName,
      enterpriseName:
        nextType === "company"
          ? extractEntrepriseName(nextAssociationName) ?? ""
          : "",
    });
  }

  function handleAutreBenevoleName(val: string) {
    setAutreBenevoleName(val);
    updateField("actorName", val);
  }

  function handleEntrepriseName(val: string) {
    updateFields({
      enterpriseName: val,
      associationName: val.trim()
        ? buildEntrepriseAssociationName(val)
        : ENTREPRISE_ASSOCIATION_OPTION,
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <div className="space-y-6">
          <div>
            <SectionTitle color="bg-violet-500">Cadre &amp; calendrier</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="action-organizer-type" className="pl-1 text-xs font-semibold text-emerald-900/70">
                  Type de structure <span aria-hidden="true">*</span>
                </label>
                <Field icon={Building}>
                  <select
                    id="action-organizer-type"
                    className={cn(inputCls, "appearance-none cursor-pointer", missingOrganizerType && inputErrCls)}
                    value={form.organizerType}
                    onChange={(e) => handleOrganizerTypeChange(e.target.value as FormState["organizerType"])}
                    required={isActionMode}
                    aria-invalid={missingOrganizerType}
                    aria-describedby={missingOrganizerType ? organizerTypeErrorId : undefined}
                  >
                    <option value="">Sélectionnez un type de structure</option>
                    {ORGANIZER_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                {missingOrganizerType && (
                  <p id={organizerTypeErrorId} className="pl-1 text-xs font-medium text-rose-700">
                    Sélectionnez un type de structure.
                  </p>
                )}
              </div>

              {form.organizerType && !isSpontaneousAction ? (
                <div className="space-y-1">
                  <label htmlFor="action-organizer-structure" className="pl-1 text-xs font-semibold text-emerald-900/70">
                    Structure <span aria-hidden="true">*</span>
                  </label>
                  <Field icon={ChevronDown}>
                    <select
                      id="action-organizer-structure"
                      data-testid="action-organizer-structure"
                      className={cn(inputCls, "appearance-none cursor-pointer", missingAssociation && inputErrCls)}
                      value={isAutreBénévole ? OTHER_VOLUNTEER_ASSOCIATION_VALUE : structureSelectValue}
                      onChange={(e) => handleAssociationChange(e.target.value)}
                      aria-invalid={missingAssociation}
                      aria-describedby={missingAssociation ? associationErrorId : undefined}
                    >
                      <option value="">
                        {form.organizerType === "company"
                          ? "Saisissez ou choisissez une entreprise"
                          : "Sélectionnez une structure"}
                      </option>
                      {currentLegacyAssociation ? (
                        <option value={currentLegacyAssociation}>
                          {currentLegacyAssociation} — valeur historique
                        </option>
                      ) : null}
                      {directoryEntries.map((entry) => {
                        const location = getOrganizerDirectoryLocationLabel(entry);
                        return (
                          <option key={entry.id} value={entry.value}>
                            {entry.name}{location ? ` — ${location}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </Field>
                  {missingAssociation && (
                    <p id={associationErrorId} className="pl-1 text-xs font-medium text-rose-700">
                      Sélectionnez une structure ou renseignez une structure libre.
                    </p>
                  )}
                </div>
              ) : null}

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

            {isActionMode && (
              <div className="mt-4">
                <ActionParticipantPicker
                  currentUserId={userMetadata.userId}
                  value={form.participantAccounts}
                  onChange={(next) => updateField("participantAccounts", next)}
                  description="Ajoutez les participants connus avant l'envoi du formulaire complet."
                />
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
              <div className="space-y-6 pt-2">
                <div>
                  <SectionTitle color="bg-sky-500">Participants &amp; temps d’action</SectionTitle>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 max-w-xl">
                    <Field icon={Users}>
                      <label className="sr-only" htmlFor="action-children-count">Enfants</label>
                      <input
                        id="action-children-count"
                        type="number"
                        min="0"
                        placeholder="Enfants"
                        className={inputCls}
                        value={form.childrenCount}
                        onChange={(e) => updateField("childrenCount", e.target.value)}
                      />
                    </Field>
                    <Field icon={Users}>
                      <label className="sr-only" htmlFor="action-adult-count">Adultes</label>
                      <input
                        id="action-adult-count"
                        type="number"
                        min="0"
                        placeholder="Adultes"
                        className={inputCls}
                        value={form.adultCount}
                        onChange={(e) => updateField("adultCount", e.target.value)}
                      />
                    </Field>
                    <Field icon={Users}>
                      <label className="sr-only" htmlFor="action-retired-count">Retraités</label>
                      <input
                        id="action-retired-count"
                        type="number"
                        min="0"
                        placeholder="Retraités"
                        className={inputCls}
                        value={form.retiredCount}
                        onChange={(e) => updateField("retiredCount", e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-emerald-900/65">
                    <span>
                      Total calculé : {volunteerParticipation.participantsCount ?? "—"} participant(s)
                    </span>
                    <span>
                      Unités opérationnelles : {volunteerParticipation.effectiveVolunteerUnits ?? "—"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-xl">
                    <Field icon={Clock}>
                      <input
                        type="number"
                        min="1"
                        placeholder="Temps d’action (min)"
                        className={inputCls}
                        value={form.durationMinutes}
                        onChange={(e) => updateField("durationMinutes", e.target.value)}
                      />
                      </Field>
                  </div>
                  <p className="mt-2 max-w-xl text-xs leading-5 text-emerald-900/55">
                    Le temps d’action couvre la marche, le ramassage, le tri et la pesée, sans séparer ces étapes.
                    {" "}La durée enregistrée reste précise ; affichage métier : {formatBusinessDurationMinutes(Number(form.durationMinutes))}.
                  </p>
                  <div className="mt-3 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field icon={Clock}>
                      <input
                        type="time"
                        aria-label="Début de l’événement"
                        value={form.eventStartTime}
                        onChange={(event) => updateField("eventStartTime", event.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field icon={Clock}>
                      <input
                        type="time"
                        aria-label="Fin de l’événement"
                        value={form.eventEndTime}
                        onChange={(event) => updateField("eventEndTime", event.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-emerald-900/55">
                    Créneau total de l’événement — début / fin, incluant briefing, matériel, regroupement et rangement.
                  </p>
                  {event.status === "available" ? (
                    <p className="mt-1 text-xs text-emerald-900/65">
                      Total : {formatBusinessDurationMinutes(event.eventDurationMinutes)}
                      {organization.status === "available"
                        ? ` · Organisation : ${formatBusinessDurationMinutes(organization.organizationMinutes)}`
                        : organization.status === "inconsistent"
                          ? " · Incohérence : créneau inférieur au temps d’action."
                          : ""}
                    </p>
                  ) : event.status === "inconsistent" ? (
                    <p className="mt-1 text-xs font-medium text-rose-700">
                      Incohérence : la fin est antérieure au début le même jour.
                    </p>
                  ) : event.status === "invalid" ? (
                    <p className="mt-1 text-xs font-medium text-rose-700">
                      Les horaires doivent respecter le format HH:MM.
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {isActionMode ? (
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
                        <p className={cn("cmm-text-small font-semibold leading-tight", isSelected ? "text-emerald-950" : "text-emerald-900/70")}>
                          {option.label}
                        </p>
                        <p className="mt-0.5 hidden cmm-text-small leading-tight text-emerald-900/45 sm:block">{option.sub}</p>
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
