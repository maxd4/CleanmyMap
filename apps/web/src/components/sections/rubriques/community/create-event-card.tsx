"use client";

import { motion } from "framer-motion";
import { PlusCircle, RefreshCw, Calendar, Users, MapPin, AlignLeft, Target, Layers, Info, Check } from "lucide-react";
import type { CreateCommunityEventForm } from "@/components/sections/rubriques/community/types";
import { InlineFieldError } from "@/components/ui/inline-field-error";
import { cn } from "@/lib/utils";

const CLEANUP_WASTE_TYPE_OPTIONS = [
  { value: "megots", label: "Mégots" },
  { value: "plastique", label: "Plastique" },
  { value: "verre", label: "Verre" },
  { value: "metal", label: "Métal" },
  { value: "mixte", label: "Mixte" },
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
  eventsValidating: boolean;
  onReloadEvents: () => Promise<unknown>;
};

function CommunityCreateEventCard(props: CommunityCreateEventCardProps) {
  const {
    createForm,
    updateCreateForm,
    onCreateEvent,
    isCreatingEvent,
    eventsValidating,
    onReloadEvents,
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

  const inputClasses = "w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all duration-300";
  const labelClasses = "flex flex-col gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-emerald-400 transition-colors";

  return (
    <div className="rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/20">
              <PlusCircle size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Nouvel Événement</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Planification Opérationnelle</p>
            </div>
          </div>
          
          <button
            onClick={() => void onReloadEvents()}
            disabled={eventsValidating}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(eventsValidating && "animate-spin")} />
            {eventsValidating ? "Synchronisation..." : "Actualiser"}
          </button>
        </div>

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
                    onChange={(e) => updateCreateForm("cleanupSupportLevel", e.target.value as any)}
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
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleWasteType(opt.value)}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
                        active 
                          ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20" 
                          : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                      )}
                    >
                      {active && <Check size={10} />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {cleanupWasteTypeError && <InlineFieldError message={cleanupWasteTypeError} />}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between gap-6">
          <p className="text-[10px] font-medium text-slate-500 italic max-w-sm">
            L&apos;événement sera validé par l&apos;IA CleanMyMap pour optimiser la logistique et les ressources.
          </p>
          <button
            onClick={() => void onCreateEvent()}
            disabled={isCreatingEvent || !canSubmit}
            className="px-10 py-4 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-600/40 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed group/btn overflow-hidden relative"
          >
            <span className="relative z-10">{isCreatingEvent ? "Processus en cours..." : "Lancer l'événement"}</span>
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export { CommunityCreateEventCard };
