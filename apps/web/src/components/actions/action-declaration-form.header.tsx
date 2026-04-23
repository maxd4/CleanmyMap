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
      <h2 className="text-xl font-semibold text-slate-900 text-balance">
        Declarer une action
      </h2>
      <p className="mt-2 text-sm text-slate-600 text-pretty">
        Enregistrez votre action terrain. Le statut initial est{" "}
        <span className="font-semibold">pending</span>.
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

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Parcours simple
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900">
            1. Localiser
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            2. Tracer
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            3. Valider
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onModeChange(isQuickMode ? "complete" : "quick")}
          className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 sm:w-auto"
        >
          {isQuickMode ? "Activer le tracé détaillé" : "Revenir au mode rapide"}
        </button>
        <details className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
            Options de mode
          </summary>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onModeChange("quick")}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition sm:w-auto ${
                isQuickMode
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Mode rapide
            </button>
            <button
              type="button"
              onClick={() => onModeChange("complete")}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition sm:w-auto ${
                !isQuickMode
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Mode détaillé
            </button>
          </div>
        </details>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {isQuickMode
          ? "Mode rapide: champs essentiels."
          : "Mode détaillé: tracé et infos complémentaires."}
      </p>
    </>
  );
}
