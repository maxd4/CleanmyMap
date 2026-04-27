import type { DeclarationMode } from"./action-declaration-form.model";

type ActionDeclarationFormHeaderProps = {
 linkedEventId?: string;
 isQuickMode: boolean;
 onModeChange: (mode: DeclarationMode) => void;
};

export function ActionDeclarationFormHeader({
  linkedEventId,
  isQuickMode,
  onModeChange,
}: ActionDeclarationFormHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-bold cmm-text-primary">Déclaration d'action</h2>
      {linkedEventId && (
        <p className="cmm-text-caption text-emerald-700">
          Événement: <span className="font-mono">{linkedEventId}</span>
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onModeChange(isQuickMode ? "complete" : "quick")}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-50 transition"
        >
          Passer en {isQuickMode ? "mode complet" : "mode rapide"}
        </button>
        <div className={`h-1.5 w-1.5 rounded-full ${isQuickMode ? "bg-emerald-500" : "bg-blue-500"}`} />
        <span className="cmm-text-caption font-medium cmm-text-muted">
          {isQuickMode ? "Saisie rapide" : "Formulaire complet"}
        </span>
      </div>
    </div>
  );
}
