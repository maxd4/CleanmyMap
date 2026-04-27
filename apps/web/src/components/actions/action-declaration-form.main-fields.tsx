import { ASSOCIATION_SELECTION_OPTIONS, ENTREPRISE_ASSOCIATION_OPTION } from "@/lib/actions/association-options";
import { PLACE_TYPE_OPTIONS } from "@/lib/actions/place-type-options";
import type { FormState } from "./action-declaration-form.model";
import { convertCigaretteButtsToKg } from "./action-declaration-form.model";
import type { ActionMegotsCondition } from "@/lib/actions/types";

type ActionDeclarationMainFieldsProps = {
  form: FormState;
  onAssociationNameChange: (value: string) => void;
  onEnterpriseNameChange: (value: string) => void;
  onActionDateChange: (value: string) => void;
  onPlaceTypeChange: (value: string) => void;
  onWasteKgChange: (value: string) => void;
  onVolunteersCountChange: (value: string) => void;
  onCigaretteButtsCountChange: (value: string) => void;
  onCigaretteButtsConditionChange: (value: ActionMegotsCondition) => void;
};

// Structures populaires (marquées avec ⭐)
const POPULAR_ASSOCIATIONS = new Set([
  "Action spontanée",
  "Entreprise",
  "Paris Clean Walk",
  "World Cleanup Day France",
  "Wings of the Ocean",
]);

// Tri alphabétique avec structures populaires marquées
const SORTED_ASSOCIATIONS = [...ASSOCIATION_SELECTION_OPTIONS]
  .sort((a, b) => a.localeCompare(b, "fr"))
  .map((option) => ({
    value: option,
    label: POPULAR_ASSOCIATIONS.has(option) ? `⭐ ${option}` : option,
    isPopular: POPULAR_ASSOCIATIONS.has(option),
  }));

export function ActionDeclarationMainFields({
  form,
  onAssociationNameChange,
  onEnterpriseNameChange,
  onActionDateChange,
  onPlaceTypeChange,
  onWasteKgChange,
  onVolunteersCountChange,
  onCigaretteButtsCountChange,
  onCigaretteButtsConditionChange,
}: ActionDeclarationMainFieldsProps) {
  const isEntrepriseMode = form.associationName === ENTREPRISE_ASSOCIATION_OPTION;
  const isActionSpontanee = form.associationName === "Action spontanée";

  // Calcul automatique de la masse de mégots
  const cigaretteButtsCount = parseInt(form.cigaretteButtsCount) || 0;
  const cigaretteButtsKg =
    cigaretteButtsCount > 0
      ? convertCigaretteButtsToKg(cigaretteButtsCount, form.cigaretteButtsCondition)
      : 0;

  return (
    <div className="space-y-4">
      {/* 1. Structure / cadre d'engagement */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
          Structure / cadre d'engagement <span className="text-emerald-500">*</span>
          <select
            required
            className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 cmm-text-primary outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
            value={form.associationName}
            onChange={(event) => onAssociationNameChange(event.target.value)}
          >
            {SORTED_ASSOCIATIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="cmm-text-caption cmm-text-muted font-normal">
            ⭐ = structures les plus utilisées
          </p>
        </label>
      </div>

      {/* 2. Nom d'entreprise (si mode entreprise) */}
      {isEntrepriseMode && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
            Nom de l'entreprise <span className="text-emerald-500">*</span>
            <input
              required
              type="text"
              className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 cmm-text-primary outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
              value={form.enterpriseName}
              onChange={(event) => onEnterpriseNameChange(event.target.value)}
              placeholder="Ex: Veolia, Orange, SNCF..."
              minLength={2}
              maxLength={100}
            />
          </label>
        </div>
      )}

      {/* 3. Date de l'action */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
          Date de l'action <span className="text-emerald-500">*</span>
          <input
            required
            type="date"
            className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 cmm-text-primary outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
            value={form.actionDate}
            onChange={(event) => onActionDateChange(event.target.value)}
          />
        </label>
      </div>

      {/* 4. Type de lieu */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
          Type de lieu <span className="text-emerald-500">*</span>
          <select
            required
            className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 cmm-text-primary outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
            value={form.placeType}
            onChange={(event) => onPlaceTypeChange(event.target.value)}
          >
            {PLACE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 5. Déchets collectés */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
        <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
          Déchets collectés (kg) <span className="text-emerald-500">*</span>
          <input
            required
            type="number"
            step="0.1"
            min="0"
            className="rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 cmm-text-primary outline-none transition focus:border-emerald-500 shadow-sm"
            value={form.wasteKg}
            onChange={(event) => onWasteKgChange(event.target.value)}
            placeholder="Ex: 12.5"
          />
          <p className="cmm-text-caption text-emerald-800 font-normal">
            Poids total des déchets ramassés
          </p>
        </label>
      </div>

      {/* 5b. Nombre de mégots (pour actions spontanées) */}
      {isActionSpontanee && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 shadow-sm">
          <div className="space-y-3">
            <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
              Nombre de mégots (optionnel)
              <input
                type="number"
                min="1"
                step="1"
                className="rounded-xl border-2 border-orange-200 bg-white px-4 py-3 cmm-text-primary outline-none transition focus:border-orange-500 shadow-sm"
                value={form.cigaretteButtsCount}
                onChange={(event) => onCigaretteButtsCountChange(event.target.value)}
                placeholder="Ex: 50"
              />
            </label>

            <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
              État des mégots
              <select
                className="rounded-xl border-2 border-orange-200 bg-white px-4 py-3 cmm-text-primary outline-none transition focus:border-orange-500 shadow-sm"
                value={form.cigaretteButtsCondition}
                onChange={(event) =>
                  onCigaretteButtsConditionChange(event.target.value as ActionMegotsCondition)
                }
              >
                <option value="propre">Sec</option>
                <option value="humide">Humide</option>
                <option value="mouille">Mouillé</option>
              </select>
            </label>

            {cigaretteButtsCount > 0 && (
              <div className="rounded-lg bg-orange-100 p-3">
                <p className="cmm-text-caption text-orange-800 font-semibold">
                  Conversion automatique : {cigaretteButtsCount} mégots{" "}
                  {form.cigaretteButtsCondition === "propre"
                    ? "secs"
                    : form.cigaretteButtsCondition === "humide"
                    ? "humides"
                    : "mouillés"}{" "}
                  = {cigaretteButtsKg.toFixed(3)} kg
                </p>
                <p className="cmm-text-caption text-orange-700 mt-1">
                  Cette masse sera ajoutée automatiquement au poids total
                </p>
              </div>
            )}

            <p className="cmm-text-caption text-orange-800 font-normal">
              Alternative au poids pour les actions individuelles
            </p>
          </div>
        </div>
      )}

      {/* 6. Nombre de bénévoles */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-2 cmm-text-small font-bold cmm-text-secondary">
          Nombre de bénévoles <span className="text-emerald-500">*</span>
          <input
            required
            type="number"
            min="1"
            className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 cmm-text-primary outline-none transition focus:border-emerald-500 focus:bg-white shadow-sm"
            value={form.volunteersCount}
            onChange={(event) => onVolunteersCountChange(event.target.value)}
            placeholder="Ex: 5"
          />
        </label>
      </div>
    </div>
  );
}
