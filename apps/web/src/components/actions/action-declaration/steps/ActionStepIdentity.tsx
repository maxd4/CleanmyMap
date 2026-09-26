"use client";

import {
  Map as MapIcon,
  Trees,
  Waves,
  Building2,
  TrainFront,
  Calendar,
  Users,
  Clock,
  Building,
  type LucideIcon,
} from "lucide-react";
import {
  deriveEventDurationMinutes,
  deriveOrganizationMinutes,
} from "@/lib/actions/time-contract";
import { cn } from "@/lib/utils";
import { OrganizerCombobox } from "@/components/actions/organizer-combobox";
import { ORGANIZER_TYPE_OPTIONS } from "@/lib/actions/organizer-type";
import type { FormState } from "../form/model";
import { ActionParticipantPicker } from "../../action-participant-picker";
import {
  formatBusinessDurationMinutes,
} from "@/lib/actions/time-contract";
import { normalizeVolunteerParticipationFromForm } from "@/lib/actions/volunteer-participation";

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
  userMetadata: { userId: string; handle?: string; displayName?: string; username?: string };
  recordType: FormState["recordType"];
  hasAttemptedSubmit?: boolean;
  mode?:
    | "all"
    | "action"
    | "participants"
    | "duration"
    | "time"
    | "organization"
    | "collection"
    | "details";
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

function OrganizerSelection({
  form,
  isActionMode,
  missingAssociation,
  associationErrorId,
  onChange,
  className,
  errorClassName,
}: {
  form: FormState;
  isActionMode: boolean;
  missingAssociation: boolean;
  associationErrorId: string;
  onChange: (selection: { id: string | null; name: string }) => void;
  className: string;
  errorClassName?: string;
}) {
  return (
    <div className={className}>
      <OrganizerCombobox
        id="action-organizer-structure"
        organizerType={form.organizerType}
        organizerId={form.organizerId}
        value={form.organizerName || (form.organizerType === "spontaneous" ? form.actorName : "")}
        onChange={onChange}
        required={isActionMode}
        invalid={missingAssociation}
        describedBy={missingAssociation ? associationErrorId : undefined}
      />
      {missingAssociation ? (
        <p id={associationErrorId} className={cn("text-xs font-medium text-rose-700", errorClassName)}>
          Renseignez un organisateur.
        </p>
      ) : null}
    </div>
  );
}

// The legacy form still renders several independently gated modes in one surface;
// organizer ownership is now delegated to OrganizerCombobox while this decomposition remains pending.
/* eslint complexity: 0 -- legacy multi-mode surface remains pending decomposition. */
export function ActionStepIdentity({
  form,
  updateField,
  updateFields,
  userMetadata,
  recordType,
  hasAttemptedSubmit,
  mode = "all",
}: Props) {
  const isActionMode = recordType === "action";
  const isSpontaneousAction = form.organizerType === "spontaneous";
  const missingDate = hasAttemptedSubmit && !form.actionDate;
  const missingAssociation = Boolean(hasAttemptedSubmit && !form.associationName);
  const missingOrganizerType = hasAttemptedSubmit && isActionMode && !form.organizerType;
  const associationErrorId = "action-association-error";
  const organizerTypeErrorId = "action-organizer-type-error";
  const dateErrorId = "action-date-error";
  const event = deriveEventDurationMinutes(form.eventStartTime, form.eventEndTime);
  const organization = deriveOrganizationMinutes({
    actionDurationMinutes: Number(form.durationMinutes),
    eventDurationMinutes: event.eventDurationMinutes,
  });
  const volunteerParticipation = normalizeVolunteerParticipationFromForm(form);

  function handleAssociationChange(selection: { id: string | null; name: string }) {
    updateFields({
      organizerId: selection.id,
      organizerName: selection.name,
      associationName: form.organizerType === "spontaneous" ? "Action spontanée" : selection.name,
    });
  }

  function handleOrganizerTypeChange(nextType: FormState["organizerType"]) {
    updateFields({
      organizerType: nextType,
      organizerId: null,
      organizerName: nextType === "spontaneous" ? userMetadata.displayName ?? userMetadata.handle ?? userMetadata.username ?? "" : "",
      associationName: nextType === "spontaneous" ? "Action spontanée" : "",
    });
  }

  if (mode !== "all") {
    const compactInputCls = "w-full min-h-12 rounded-xl border border-emerald-200/70 bg-white px-3.5 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

    if (mode === "action") {
      return (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="action-action-date" className="text-xs font-semibold text-emerald-900/75">
              Date de l’action <span aria-hidden="true">*</span><span className="ml-2 text-xs font-semibold text-rose-700">Obligatoire</span>
            </label>
            <input
              id="action-action-date"
              type="date"
              className={cn(compactInputCls, missingDate && inputErrCls)}
              value={form.actionDate}
              onChange={(event) => updateField("actionDate", event.target.value)}
              aria-invalid={missingDate}
              aria-describedby={missingDate ? dateErrorId : undefined}
            />
            {missingDate ? (
              <p id={dateErrorId} className="text-xs font-medium text-rose-700">
                Indiquez la date de l’action.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="action-organizer-type" className="text-xs font-semibold text-emerald-900/75">
              Type de structure <span aria-hidden="true">*</span><span className="ml-2 text-xs font-semibold text-rose-700">Obligatoire</span>
            </label>
            <select
              id="action-organizer-type"
              className={cn(compactInputCls, "appearance-none cursor-pointer", missingOrganizerType && inputErrCls)}
              value={form.organizerType}
              onChange={(event) => handleOrganizerTypeChange(event.target.value as FormState["organizerType"])}
              required={isActionMode}
              aria-invalid={missingOrganizerType}
              aria-describedby={missingOrganizerType ? organizerTypeErrorId : undefined}
            >
              <option value="">Sélectionnez un type</option>
              {ORGANIZER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {missingOrganizerType ? (
              <p id={organizerTypeErrorId} className="text-xs font-medium text-rose-700">
                Sélectionnez un type de structure.
              </p>
            ) : null}
          </div>

          {form.organizerType ? (
            <OrganizerSelection
              form={form}
              isActionMode={isActionMode}
              missingAssociation={missingAssociation}
              associationErrorId={associationErrorId}
              onChange={handleAssociationChange}
              className="space-y-1.5"
            />
          ) : null}
        </div>
      );
    }

    if (mode === "participants") {
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {([
              ["action-children-count", "Enfants", "childrenCount"],
              ["action-adult-count", "Adultes", "adultCount"],
              ["action-retired-count", "Retraités", "retiredCount"],
            ] as const).map(([id, label, key]) => (
              <label key={id} htmlFor={id} className="space-y-1.5">
                <span className="block text-xs font-semibold text-emerald-900/75">{label}</span>
                <input
                  id={id}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="0"
                  className={compactInputCls}
                  value={form[key]}
                  onChange={(event) => updateField(key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="text-xs font-semibold text-emerald-900/70">
            Total calculé : {volunteerParticipation.participantsCount ?? "—"} participant(s)
          </p>
          <p className="text-xs text-emerald-900/55">
            Si une catégorie est renseignée, renseignez les trois catégories. Le total doit être au moins égal à 1.
          </p>
        </div>
      );
    }

    if (mode === "duration") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <label htmlFor="action-duration-minutes" className="space-y-1.5">
            <span className="block text-xs font-semibold text-emerald-900/75">Durée d’action (min)</span>
            <input
              id="action-duration-minutes"
              type="number"
              min="1"
              inputMode="numeric"
              className={compactInputCls}
              value={form.durationMinutes}
              onChange={(event) => updateField("durationMinutes", event.target.value)}
            />
          </label>
        </div>
      );
    }

    if (mode === "time") {
      return (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
          <label htmlFor="action-event-start" className="space-y-1.5">
            <span className="block text-xs font-semibold text-emerald-900/75">Rendez-vous · début</span>
            <input
              id="action-event-start"
              type="time"
              className={compactInputCls}
              value={form.eventStartTime}
              onChange={(event) => updateField("eventStartTime", event.target.value)}
            />
          </label>
          <label htmlFor="action-event-end" className="space-y-1.5">
            <span className="block text-xs font-semibold text-emerald-900/75">Fin du créneau</span>
            <input
              id="action-event-end"
              type="time"
              className={compactInputCls}
              value={form.eventEndTime}
              onChange={(event) => updateField("eventEndTime", event.target.value)}
            />
          </label>
          </div>
          {event.status !== "incomplete" ? (
            <p className={cn("text-xs", event.status === "inconsistent" || event.status === "invalid" ? "font-medium text-rose-700" : "text-emerald-900/65")}>
              {event.status === "available"
                ? `Créneau global : ${formatBusinessDurationMinutes(event.eventDurationMinutes)}${organization.status === "available" ? ` · Organisation : ${formatBusinessDurationMinutes(organization.organizationMinutes)}` : organization.status === "inconsistent" ? " · Incohérence avec la durée d’action." : ""}`
                : event.status === "inconsistent"
                  ? "Incohérence : la fin est antérieure au début."
                  : "Les horaires doivent respecter le format HH:MM."}
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {mode !== "collection" && isActionMode && !isSpontaneousAction ? (
          <div className="space-y-1.5">
            <label htmlFor="action-organizer-accounts" className="text-xs font-semibold text-emerald-900/75">Organisateurs associés</label>
            <input id="action-organizer-accounts" type="text" className={compactInputCls} value={form.organizerAccounts} onChange={(event) => updateField("organizerAccounts", event.target.value)} maxLength={300} placeholder="Pseudo, nom affiché ou ID" />
          </div>
        ) : null}
        {mode !== "collection" && isActionMode ? (
          <ActionParticipantPicker
            currentUserId={userMetadata.userId}
            value={form.participantAccounts}
            onChange={(next) => updateField("participantAccounts", next)}
            description="Ajoutez les participants connus avant l’envoi du formulaire complet."
          />
        ) : null}
        {mode !== "organization" && isActionMode ? (
          <div>
            <SectionTitle color="bg-emerald-500">Environnement de collecte</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PLACE_TYPE_TILE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = option.values.some((value) => value === form.placeType);
                return (
                  <button
                    key={option.label}
                    type="button"
                    title={option.sub}
                    onClick={() => updateField("placeType", option.value)}
                    className={cn("relative flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center transition-all", isSelected ? "border-emerald-300 bg-[#ECF8EF] shadow-sm" : "border-emerald-200/70 bg-[#F3FBF6] hover:border-emerald-300 hover:bg-[#EAF7EF]")}
                  >
                    <Icon size={16} className={isSelected ? "text-emerald-700" : "text-emerald-600/70"} />
                    <span className={cn("text-xs font-semibold leading-tight", isSelected ? "text-emerald-950" : "text-emerald-900/70")}>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
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

              {form.organizerType ? (
                <OrganizerSelection
                  form={form}
                  isActionMode={isActionMode}
                  missingAssociation={missingAssociation}
                  associationErrorId={associationErrorId}
                  onChange={handleAssociationChange}
                  className="space-y-1"
                  errorClassName="pl-1"
                />
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
