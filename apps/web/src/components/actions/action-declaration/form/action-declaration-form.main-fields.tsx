import { ASSOCIATION_SELECTION_OPTIONS, ENTREPRISE_ASSOCIATION_OPTION } from "@/lib/actions/association-options";
import { PLACE_TYPE_FORM_OPTIONS, normalizePlaceTypeForUi } from "@/lib/actions/place-type-options";
import type { FormState } from "./model";
import { convertCigaretteButtsToKg } from "./model";
import type { ActionMegotsCondition } from "@/lib/actions/types";
import { CmmField, CmmInput, CmmSelect } from "@/components/ui/cmm-field";

type ActionDeclarationMainFieldsProps = {
  form: FormState;
  onAssociationNameChange: (value: string) => void;
  onEnterpriseNameChange: (value: string) => void;
  onOrganizerAccountsChange: (value: string) => void;
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
  onOrganizerAccountsChange,
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
        <CmmField
          label="Structure / cadre d&apos;engagement"
          required
          hint="⭐ = structures les plus utilisées"
        >
          <CmmSelect
            value={form.associationName}
            onChange={(event) => onAssociationNameChange(event.target.value)}
          >
            {SORTED_ASSOCIATIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </CmmSelect>
        </CmmField>
      </div>

      {/* 2. Nom d'entreprise (si mode entreprise) */}
      {isEntrepriseMode && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <CmmField label="Nom de l&apos;entreprise" required>
            <CmmInput
              type="text"
              value={form.enterpriseName}
              onChange={(event) => onEnterpriseNameChange(event.target.value)}
              placeholder="Ex: Veolia, Orange, SNCF..."
              minLength={2}
              maxLength={100}
            />
          </CmmField>
        </div>
      )}

      {form.recordType === "action" && !isActionSpontanee && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <CmmField
            label="Organisateur / Référant ayant participé à l&apos;action"
            hint="Hors action spontanée, indiquez le compte du référant ou de l&apos;organisateur ayant participé à l&apos;action. À défaut, le compte admin par défaut sera utilisé."
          >
            <CmmInput
              type="text"
              value={form.organizerAccounts}
              onChange={(event) => onOrganizerAccountsChange(event.target.value)}
              placeholder="Pseudo, nom affiché ou ID, séparés par des virgules"
            />
          </CmmField>
        </div>
      )}

      {/* 3. Date de l'action */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <CmmField label="Date de l&apos;action" required>
          <CmmInput
            type="date"
            value={form.actionDate}
            onChange={(event) => onActionDateChange(event.target.value)}
          />
        </CmmField>
      </div>

      {/* 4. Type de lieu */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <CmmField label="Type de lieu" required>
          <CmmSelect
            value={normalizePlaceTypeForUi(form.placeType)}
            onChange={(event) => onPlaceTypeChange(event.target.value)}
          >
            {PLACE_TYPE_FORM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </CmmSelect>
        </CmmField>
      </div>

      {/* 5. Déchets collectés */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
        <CmmField label="Déchets collectés (kg)" required hint="Poids total des déchets ramassés">
          <CmmInput
            type="number"
            step="0.1"
            min="0"
            value={form.wasteKg}
            onChange={(event) => onWasteKgChange(event.target.value)}
            placeholder="Ex: 12.5"
          />
        </CmmField>
      </div>

      {/* 5b. Nombre de mégots (pour actions spontanées) */}
      {isActionSpontanee && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 shadow-sm">
          <div className="space-y-3">
            <CmmField label="Nombre de mégots (optionnel)">
              <CmmInput
                type="number"
                min="1"
                step="1"
                value={form.cigaretteButtsCount}
                onChange={(event) => onCigaretteButtsCountChange(event.target.value)}
                placeholder="Ex: 50"
              />
            </CmmField>

            <CmmField label="État des mégots">
              <CmmSelect
                value={form.cigaretteButtsCondition}
                onChange={(event) =>
                  onCigaretteButtsConditionChange(event.target.value as ActionMegotsCondition)
                }
              >
                <option value="propre">Sec</option>
                <option value="humide">Humide</option>
                <option value="mouille">Mouillé</option>
              </CmmSelect>
            </CmmField>

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
        <CmmField label="Nombre de bénévoles" required>
          <CmmInput
            type="number"
            min="1"
            value={form.volunteersCount}
            onChange={(event) => onVolunteersCountChange(event.target.value)}
            placeholder="Ex: 5"
          />
        </CmmField>
      </div>
    </div>
  );
}
