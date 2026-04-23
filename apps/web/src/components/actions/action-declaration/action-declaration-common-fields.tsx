import {
  ASSOCIATION_SELECTION_OPTIONS,
} from "@/lib/actions/association-options";
import { PLACE_TYPE_OPTIONS } from "@/lib/actions/place-type-options";
import { associationOptionLabels } from "./payload";
import type { FormState, UpdateFormField } from "./types";

type ActionDeclarationCommonFieldsProps = {
  form: FormState;
  updateField: UpdateFormField;
  resolvedActorOptions: string[];
  isEntrepriseMode: boolean;
};

export function ActionDeclarationCommonFields({
  form,
  updateField,
  resolvedActorOptions,
  isEntrepriseMode,
}: ActionDeclarationCommonFieldsProps) {
  return (
    <>
      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Nom / prénom ou compte
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
          value={form.actorName}
          onChange={(event) => updateField("actorName", event.target.value)}
        >
          {resolvedActorOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Sélection issue du compte Clerk (prénom/pseudo). Aucune saisie libre
          non tracée.
        </p>
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Structure / cadre d&apos;engagement *
        <select
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
          value={form.associationName}
          onChange={(event) => updateField("associationName", event.target.value)}
        >
          {ASSOCIATION_SELECTION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {associationOptionLabels[option] ?? option}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Liste normalisée issue de l&apos;historique Cleanwalk Paris, pour des
          exports et classements homogènes.
        </p>
      </label>

      {isEntrepriseMode ? (
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Nom de la structure *
          <input
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.enterpriseName}
            onChange={(event) => updateField("enterpriseName", event.target.value)}
            placeholder="Ex: Veolia, BNP Paribas, SNCF..."
            minLength={2}
            maxLength={100}
          />
          <p className="text-xs text-slate-500">
            Le rapport enregistrera cette valeur comme : Structure - Nom.
          </p>
        </label>
      ) : null}

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Date de l&apos;action *
        <input
          type="date"
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
          value={form.actionDate}
          onChange={(event) => updateField("actionDate", event.target.value)}
        />
      </label>

      <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-700">
        Emplacement (adresse ou libellé) *
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
          value={form.locationLabel}
          onChange={(event) => updateField("locationLabel", event.target.value)}
          placeholder="Ex: Place de la République, Paris"
          minLength={2}
          maxLength={200}
        />
      </label>

      <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-700">
        Type de lieu *
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
          value={form.placeType}
          onChange={(event) => updateField("placeType", event.target.value)}
        >
          {PLACE_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Cette information permet de mieux classifier la zone et d&apos;ajuster
          les rapports d&apos;impact.
        </p>
      </label>
    </>
  );
}
