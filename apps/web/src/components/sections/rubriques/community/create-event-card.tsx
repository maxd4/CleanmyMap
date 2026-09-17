"use client";

import { PlusCircle, Calendar, Users, MapPin, AlignLeft, Target, Layers, Info, Check } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import type { CreateCommunityEventForm } from "@/components/sections/rubriques/community/types";
import { InlineFieldError } from "@/components/ui/inline-field-error";
import { cn } from "@/lib/utils";
import { getWasteCategory } from "@/lib/waste";

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

function CommunityCreateEventCard(props: CommunityCreateEventCardProps) {
  const {
    createForm,
    updateCreateForm,
    onCreateEvent,
    isCreatingEvent,
  } = props;

  const titleError =
    createForm.title.trim().length < 4
      ? "Le titre doit contenir au moins 4 caractères."
      : null;
  const dateError =
    createForm.eventDate.trim().length === 0
      ? "Choisissez une date."
      : null;
  const locationError =
    createForm.locationLabel.trim().length < 3
      ? "Le lieu doit être précisé."
      : null;
  const capacityValue = createForm.capacityTarget.trim();
  const capacityError =
    capacityValue.length > 0 && Number.isInteger(Number(capacityValue)) && Number(capacityValue) >= 1
      ? null
      : capacityValue.length > 0
      ? "La capacité cible doit être un entier strictement positif."
      : null;
  const cleanupObjectiveError =
    createForm.cleanupObjective.trim().length < 2
      ? "Précisez l'objectif du cleanup."
      : null;
  const cleanupZoneError =
    createForm.cleanupZone.trim().length < 2
      ? "Précisez la zone ciblée."
      : null;
  const cleanupWasteTypeError =
    createForm.cleanupWasteTypesExpected.length === 0
      ? "Sélectionnez au moins un type de déchets attendu."
      : null;
  const canSubmit =
    !titleError &&
    !dateError &&
    !locationError &&
    !capacityError &&
    !cleanupObjectiveError &&
    !cleanupZoneError &&
    !cleanupWasteTypeError;

  const toggleWasteType = (
    value: (typeof CLEANUP_WASTE_TYPE_OPTIONS)[number]["value"],
  ) => {
    updateCreateForm(
      "cleanupWasteTypesExpected",
      createForm.cleanupWasteTypesExpected.includes(value)
        ? createForm.cleanupWasteTypesExpected.filter((item) => item !== value)
        : [...createForm.cleanupWasteTypesExpected, value],
    );
  };

  const inputClasses = "w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-pink-500/50 focus:bg-white/[0.08] transition-all duration-300";
  const labelClasses = "flex flex-col gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-pink-400 transition-colors";

  return (
    <CmmDisclosure
      summary={
        <span className="flex items-center gap-3">
          <PlusCircle size={20} aria-hidden="true" />
          <span>
            <span className="block font-semibold">Organiser une mission</span>
            <span className="cmm-text-small cmm-text-secondary">Ouvrir le parcours de création</span>
          </span>
        </span>
      }
      tone="rose"
      size="md"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="pt-4">

        <div className="grid gap-8 md:grid-cols-2">
          {/* Main Info */}
          <div className="space-y-6 md:col-span-2 grid md:grid-cols-2 gap-6 items-start">
            <div className="group space-y-2">
              <label className={labelClasses}>
                <span className="flex items-center gap-2"><AlignLeft size={12} /> Titre de l&apos;action</span>
                <input
                  value={createForm.title}
                  onChange={(e) => updateCreateForm("title", e.target.value)}
                  placeholder="Ex: Opération Canal Propre"
                  className={inputClasses}
                />
                {titleError && <InlineFieldError message={titleError} />}
              </label>
            </div>

            <div className="group space-y-2">
              <label className={labelClasses}>
                <span className="flex items-center gap-2"><Calendar size={12} /> Date prévue</span>
                <input
                  type="date"
                  value={createForm.eventDate}
                  onChange={(e) => updateCreateForm("eventDate", e.target.value)}
                  className={cn(inputClasses, "appearance-none")}
                  style={{ colorScheme: 'dark' }}
                />
                {dateError && <InlineFieldError message={dateError} />}
              </label>
            </div>

            <div className="group space-y-2">
              <label className={labelClasses}>
                <span className="flex items-center gap-2"><Users size={12} /> Capacité cible</span>
                <input
                  type="number"
                  min={1}
                  value={createForm.capacityTarget}
                  onChange={(e) => updateCreateForm("capacityTarget", e.target.value)}
                  placeholder="Nombre de volontaires"
                  className={inputClasses}
                />
                {capacityError && <InlineFieldError message={capacityError} />}
              </label>
            </div>

            <div className="group space-y-2">
              <label className={labelClasses}>
                <span className="flex items-center gap-2"><MapPin size={12} /> Localisation précise</span>
                <input
                  value={createForm.locationLabel}
                  onChange={(e) => updateCreateForm("locationLabel", e.target.value)}
                  placeholder="Adresse ou point de RDV"
                  className={inputClasses}
                />
                {locationError && <InlineFieldError message={locationError} />}
              </label>
            </div>

            <div className="group space-y-2">
              <label className={labelClasses}>
                <span className="flex items-center gap-2"><MapPin size={12} /> Latitude (optionnelle)</span>
                <input
                  type="number"
                  min={-90}
                  max={90}
                  step="any"
                  value={createForm.latitude}
                  onChange={(e) => updateCreateForm("latitude", e.target.value)}
                  placeholder="Ex: 48.8566"
                  className={inputClasses}
                />
              </label>
            </div>

            <div className="group space-y-2">
              <label className={labelClasses}>
                <span className="flex items-center gap-2"><MapPin size={12} /> Longitude (optionnelle)</span>
                <input
                  type="number"
                  min={-180}
                  max={180}
                  step="any"
                  value={createForm.longitude}
                  onChange={(e) => updateCreateForm("longitude", e.target.value)}
                  placeholder="Ex: 2.3522"
                  className={inputClasses}
                />
              </label>
              <p className="text-[10px] font-medium normal-case tracking-normal text-slate-500">
                Laissez les deux champs vides si la position précise n&apos;est pas connue. Aucun arrondissement ne sera converti automatiquement.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 h-px bg-white/5" />

          {/* Cleanup Details */}
          <div className="space-y-6 md:col-span-2">
            <div className="group space-y-2">
              <label className={labelClasses}>
                <span className="flex items-center gap-2"><Target size={12} /> Objectif principal</span>
                <input
                  value={createForm.cleanupObjective}
                  onChange={(e) => updateCreateForm("cleanupObjective", e.target.value)}
                  placeholder="Ex: Éradication des dépôts sauvages"
                  className={inputClasses}
                />
                {cleanupObjectiveError && <InlineFieldError message={cleanupObjectiveError} />}
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group space-y-2">
                <label className={labelClasses}>
                  <span className="flex items-center gap-2"><Layers size={12} /> Zone ciblée</span>
                  <input
                    value={createForm.cleanupZone}
                    onChange={(e) => updateCreateForm("cleanupZone", e.target.value)}
                    placeholder="Ex: Berges du Canal"
                    className={inputClasses}
                  />
                  {cleanupZoneError && <InlineFieldError message={cleanupZoneError} />}
                </label>
              </div>

              <div className="group space-y-2">
                <label className={labelClasses}>
                  <span className="flex items-center gap-2"><Info size={12} /> Niveau de soutien</span>
                  <select
                    value={createForm.cleanupSupportLevel}
                    onChange={(e) => updateCreateForm("cleanupSupportLevel", e.target.value as CreateCommunityEventForm["cleanupSupportLevel"])}
                    className={cn(inputClasses, "appearance-none bg-slate-900")}
                  >
                    {CLEANUP_SUPPORT_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="group space-y-4">
              <span className={labelClasses}>Flux de déchets attendus</span>
              <div className="flex flex-wrap gap-3">
                {CLEANUP_WASTE_TYPE_OPTIONS.map((opt) => {
                  const active = createForm.cleanupWasteTypesExpected.includes(opt.value);
                  return (
                    <CmmButton
                      key={opt.value}
                      type="button"
                      onClick={() => toggleWasteType(opt.value)}
                      tone={active ? "primary" : "tertiary"}
                      variant="pill"
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
                        active ? "shadow-lg shadow-pink-600/20" : "hover:text-slate-300 hover:bg-white/10"
                      )}
                    >
                      {active && <Check size={10} />}
                      {opt.label}
                    </CmmButton>
                  );
                })}
              </div>
              {cleanupWasteTypeError && <InlineFieldError message={cleanupWasteTypeError} />}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end border-t border-white/5 pt-6">
          <CmmButton
            onClick={() => void onCreateEvent()}
            disabled={isCreatingEvent || !canSubmit}
            tone="primary"
            variant="pill"
            className="px-10 py-4 rounded-2xl text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-pink-500 transition-all shadow-2xl shadow-pink-600/40 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed group/btn overflow-hidden relative"
          >
            <span className="relative z-10">{isCreatingEvent ? "Création en cours..." : "Créer la mission"}</span>
          </CmmButton>
        </div>
      </div>
    </CmmDisclosure>
  );
}

export { CommunityCreateEventCard };
