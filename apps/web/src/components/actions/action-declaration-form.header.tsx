import type { DeclarationMode } from "./action-declaration-form.model";

type ActionDeclarationFormHeaderProps = {
  clerkIdentityLabel: string;
  clerkUserId: string;
  linkedEventId?: string;
  isQuickMode: boolean;
  onModeChange: (mode: DeclarationMode) => void;
};

export function ActionDeclarationFormHeader({
  clerkIdentityLabel,
  clerkUserId,
  linkedEventId,
  isQuickMode,
  onModeChange,
}: ActionDeclarationFormHeaderProps) {
  return (
    <>
      <h2 className="text-xl font-semibold text-slate-900">Declarer une action</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enregistrez votre action terrain pour l&apos;historique benevole. Le statut
        initial est <span className="font-semibold">pending</span>.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Compte Clerk actif: <span className="font-semibold">{clerkIdentityLabel}</span>{" "}
        (<span className="font-mono">{clerkUserId}</span>)
      </p>
      {linkedEventId ? (
        <p className="mt-2 text-xs text-emerald-700">
          Declaration liee a l&apos;evenement:{" "}
          <span className="font-mono">{linkedEventId}</span>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onModeChange("quick")}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            isQuickMode
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Rapide &lt;60s
        </button>
        <button
          type="button"
          onClick={() => onModeChange("complete")}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            !isQuickMode
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Complet avec preuve
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {isQuickMode
          ? "Mode rapide: champs essentiels, validation souple pendant la saisie."
          : "Mode complet: geolocalisation detaillee, trace/polygone et informations additionnelles."}
      </p>
    </>
  );
}
