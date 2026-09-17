"use client";

import { useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { AlignLeft, Calendar, Check, Info, Layers, MapPin, Plus, Target, Users } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import type { CreateCommunityEventForm } from "@/components/sections/rubriques/community/types";
import { InlineFieldError } from "@/components/ui/inline-field-error";
import { cn } from "@/lib/utils";
import { getWasteCategory } from "@/lib/waste";
import { canOpenCommunityCreateForm, redirectToCommunitySignIn } from "./mutation-auth";

const CLEANUP_WASTE_TYPE_OPTIONS = [
  { value: "megots", label: getWasteCategory("cigarette_butt").labels.fr },
  { value: "plastique", label: getWasteCategory("plastic").labels.fr },
  { value: "verre", label: getWasteCategory("glass").labels.fr },
  { value: "metal", label: getWasteCategory("metal").labels.fr },
  { value: "mixte", label: getWasteCategory("mixed_residual").labels.fr },
] as const;

const CLEANUP_SUPPORT_LEVEL_OPTIONS = [
  { value: "faible", label: "Soutien léger" },
  { value: "moyen", label: "Soutien modéré" },
  { value: "fort", label: "Soutien renforcé" },
] as const;

type CommunityCreateEventCardProps = {
  createForm: CreateCommunityEventForm;
  updateCreateForm: <K extends keyof CreateCommunityEventForm>(
    key: K,
    value: CreateCommunityEventForm[K],
  ) => void;
  onCreateEvent: () => Promise<void>;
  isCreatingEvent: boolean;
};

function CommunityCreateEventCard({
  createForm,
  updateCreateForm,
  onCreateEvent,
  isCreatingEvent,
}: CommunityCreateEventCardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();
  const [open, setOpen] = useState(false);

  const titleError = createForm.title.trim().length < 4 ? "Le titre doit contenir au moins 4 caractères." : null;
  const dateError = createForm.eventDate.trim().length === 0 ? "Choisissez une date." : null;
  const locationError = createForm.locationLabel.trim().length < 3 ? "Le lieu doit être précisé." : null;
  const capacityValue = createForm.capacityTarget.trim();
  const capacityError =
    capacityValue.length > 0 && Number.isInteger(Number(capacityValue)) && Number(capacityValue) >= 1
      ? null
      : capacityValue.length > 0
        ? "La capacité cible doit être un entier strictement positif."
        : null;
  const cleanupObjectiveError = createForm.cleanupObjective.trim().length < 2 ? "Précisez l’objectif de la mission." : null;
  const cleanupZoneError = createForm.cleanupZone.trim().length < 2 ? "Précisez la zone ciblée." : null;
  const cleanupWasteTypeError = createForm.cleanupWasteTypesExpected.length === 0 ? "Sélectionnez au moins un type de déchets attendu." : null;
  const canSubmit =
    !titleError &&
    !dateError &&
    !locationError &&
    !capacityError &&
    !cleanupObjectiveError &&
    !cleanupZoneError &&
    !cleanupWasteTypeError;

  function handleToggle(nextOpen: boolean) {
    if (!nextOpen) {
      setOpen(false);
      return;
    }

    if (!isLoaded) {
      setOpen(false);
      return;
    }

    if (!canOpenCommunityCreateForm(isLoaded, isSignedIn)) {
      setOpen(false);
      redirectToCommunitySignIn(redirectToSignIn);
      return;
    }

    setOpen(true);
  }

  function toggleWasteType(value: (typeof CLEANUP_WASTE_TYPE_OPTIONS)[number]["value"]) {
    updateCreateForm(
      "cleanupWasteTypesExpected",
      createForm.cleanupWasteTypesExpected.includes(value)
        ? createForm.cleanupWasteTypesExpected.filter((item) => item !== value)
        : [...createForm.cleanupWasteTypesExpected, value],
    );
  }

  const inputClasses = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100";
  const labelClasses = "flex flex-col gap-2 text-sm font-semibold text-slate-700";

  return (
    <CmmDisclosure
      open={open}
      onToggle={handleToggle}
      summary={
        <span className="flex items-center gap-2">
          <Plus size={17} aria-hidden="true" />
          <span>Organiser une mission</span>
        </span>
      }
      tone="rose"
      size="sm"
      className="w-full rounded-full border border-pink-200 bg-white px-4 py-1 shadow-sm sm:w-auto"
    >
      <form
        className="mt-4 grid gap-5 border-t border-pink-100 pt-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) void onCreateEvent();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClasses}>
            <span className="flex items-center gap-2"><AlignLeft size={15} aria-hidden="true" /> Titre de la mission</span>
            <input value={createForm.title} onChange={(event) => updateCreateForm("title", event.target.value)} placeholder="Ex. Opération Canal Propre" className={inputClasses} />
            {titleError ? <InlineFieldError message={titleError} /> : null}
          </label>
          <label className={labelClasses}>
            <span className="flex items-center gap-2"><Calendar size={15} aria-hidden="true" /> Date prévue</span>
            <input type="date" value={createForm.eventDate} onChange={(event) => updateCreateForm("eventDate", event.target.value)} className={inputClasses} />
            {dateError ? <InlineFieldError message={dateError} /> : null}
          </label>
          <label className={labelClasses}>
            <span className="flex items-center gap-2"><Users size={15} aria-hidden="true" /> Capacité cible</span>
            <input type="number" min={1} value={createForm.capacityTarget} onChange={(event) => updateCreateForm("capacityTarget", event.target.value)} placeholder="Nombre de bénévoles" className={inputClasses} />
            {capacityError ? <InlineFieldError message={capacityError} /> : null}
          </label>
          <label className={labelClasses}>
            <span className="flex items-center gap-2"><MapPin size={15} aria-hidden="true" /> Lieu</span>
            <input value={createForm.locationLabel} onChange={(event) => updateCreateForm("locationLabel", event.target.value)} placeholder="Adresse ou point de rendez-vous" className={inputClasses} />
            {locationError ? <InlineFieldError message={locationError} /> : null}
          </label>
          <label className={labelClasses}>
            <span className="flex items-center gap-2"><MapPin size={15} aria-hidden="true" /> Latitude (optionnelle)</span>
            <input type="number" min={-90} max={90} step="any" value={createForm.latitude} onChange={(event) => updateCreateForm("latitude", event.target.value)} placeholder="Ex. 48.8566" className={inputClasses} />
          </label>
          <label className={labelClasses}>
            <span className="flex items-center gap-2"><MapPin size={15} aria-hidden="true" /> Longitude (optionnelle)</span>
            <input type="number" min={-180} max={180} step="any" value={createForm.longitude} onChange={(event) => updateCreateForm("longitude", event.target.value)} placeholder="Ex. 2.3522" className={inputClasses} />
          </label>
          <label className={cn(labelClasses, "sm:col-span-2")}>
            <span>Description (optionnelle)</span>
            <textarea value={createForm.description} onChange={(event) => updateCreateForm("description", event.target.value)} rows={3} placeholder="Présentez brièvement la mission." className={inputClasses} />
          </label>
        </div>

        <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <label className={labelClasses}>
            <span className="flex items-center gap-2"><Target size={15} aria-hidden="true" /> Objectif principal</span>
            <input value={createForm.cleanupObjective} onChange={(event) => updateCreateForm("cleanupObjective", event.target.value)} placeholder="Ex. Retirer des dépôts sauvages" className={inputClasses} />
            {cleanupObjectiveError ? <InlineFieldError message={cleanupObjectiveError} /> : null}
          </label>
          <label className={labelClasses}>
            <span className="flex items-center gap-2"><Layers size={15} aria-hidden="true" /> Zone ciblée</span>
            <input value={createForm.cleanupZone} onChange={(event) => updateCreateForm("cleanupZone", event.target.value)} placeholder="Ex. Berges du canal" className={inputClasses} />
            {cleanupZoneError ? <InlineFieldError message={cleanupZoneError} /> : null}
          </label>
          <label className={labelClasses}>
            <span className="flex items-center gap-2"><Info size={15} aria-hidden="true" /> Niveau de soutien</span>
            <select value={createForm.cleanupSupportLevel} onChange={(event) => updateCreateForm("cleanupSupportLevel", event.target.value as CreateCommunityEventForm["cleanupSupportLevel"])} className={cn(inputClasses, "appearance-none")}>
              {CLEANUP_SUPPORT_LEVEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className={labelClasses}>
            <span>Logistique (optionnelle)</span>
            <input value={createForm.cleanupLogisticsNeeds} onChange={(event) => updateCreateForm("cleanupLogisticsNeeds", event.target.value)} placeholder="Ex. sacs et gants à prévoir" className={inputClasses} />
          </label>
          <fieldset className="space-y-2">
            <legend className={labelClasses}>Déchets attendus</legend>
            <div className="flex flex-wrap gap-2">
              {CLEANUP_WASTE_TYPE_OPTIONS.map((option) => {
                const active = createForm.cleanupWasteTypesExpected.includes(option.value);
                return (
                  <CmmButton key={option.value} type="button" onClick={() => toggleWasteType(option.value)} tone={active ? "primary" : "tertiary"} variant="pill" className="min-h-10 px-3 text-sm">
                    {active ? <Check size={14} aria-hidden="true" /> : null}
                    {option.label}
                  </CmmButton>
                );
              })}
            </div>
            {cleanupWasteTypeError ? <InlineFieldError message={cleanupWasteTypeError} /> : null}
          </fieldset>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <CmmButton type="submit" disabled={isCreatingEvent || !canSubmit} loading={isCreatingEvent} tone="primary" variant="pill" className="min-h-11">
            {isCreatingEvent ? "Création en cours…" : "Créer la mission"}
          </CmmButton>
        </div>
      </form>
    </CmmDisclosure>
  );
}

export { CommunityCreateEventCard };
