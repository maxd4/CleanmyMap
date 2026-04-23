import {
  ASSOCIATION_SELECTION_OPTIONS,
  ENTREPRISE_ASSOCIATION_OPTION,
} from "@/lib/actions/association-options";

const associationOptionLabels: Record<string, string> = {
  "Action spontanee":
    "Action spontanee - benevole non rattache a une association",
  Entreprise: "Entreprise - participation dans un cadre RSE",
};

type ActionDeclarationIdentityFieldsProps = {
  resolvedActorOptions: string[];
  actorName: string;
  associationName: string;
  enterpriseName: string;
  onActorNameChange: (value: string) => void;
  onAssociationNameChange: (value: string) => void;
  onEnterpriseNameChange: (value: string) => void;
};

export function ActionDeclarationIdentityFields({
  resolvedActorOptions,
  actorName,
  associationName,
  enterpriseName,
  onActorNameChange,
  onAssociationNameChange,
  onEnterpriseNameChange,
}: ActionDeclarationIdentityFieldsProps) {
  const isEntrepriseMode = associationName === ENTREPRISE_ASSOCIATION_OPTION;

  return (
    <>
      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Nom / prénom ou compte
        <select
          name="actorName"
          autoComplete="name"
          className="rounded-xl border border-slate-300 px-3 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
          value={actorName}
          onChange={(event) => onActorNameChange(event.target.value)}
        >
        {resolvedActorOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Compte Clerk ou nom enregistré.
        </p>
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Structure / cadre d&apos;engagement *
        <select
          required
          name="associationName"
          autoComplete="organization"
          className="rounded-xl border border-slate-300 px-3 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
          value={associationName}
          onChange={(event) => onAssociationNameChange(event.target.value)}
        >
          {ASSOCIATION_SELECTION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {associationOptionLabels[option] ?? option}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Normalisé pour les exports.
        </p>
      </label>

      {isEntrepriseMode ? (
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Nom de la structure *
          <input
            required
            name="enterpriseName"
            autoComplete="organization"
            className="rounded-xl border border-slate-300 px-3 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
            value={enterpriseName}
            onChange={(event) => onEnterpriseNameChange(event.target.value)}
            placeholder="Ex: Veolia, BNP Paribas, SNCF..."
            minLength={2}
            maxLength={100}
          />
          <p className="text-xs text-slate-500">
            Enregistré comme Structure - Nom.
          </p>
        </label>
      ) : null}
    </>
  );
}
