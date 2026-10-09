import type { ReactNode } from "react";
import { Info, type LucideIcon } from "lucide-react";

export function SectionLabel({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-emerald-100/80 pb-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200/70 bg-[#ECF8EF] text-emerald-700">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-xl font-black tracking-tight text-emerald-950">{title}</h3>
        <p className="cmm-text-body cmm-text-primary mt-1 max-w-3xl">{subtitle}</p>
      </div>
    </div>
  );
}

export function FieldShell({
  label,
  children,
  hint,
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-emerald-950">
      <span className="flex items-center gap-2">{label}</span>
      {children}
      {hint ? <span className="block text-xs font-normal leading-5 text-emerald-900/58">{hint}</span> : null}
    </label>
  );
}

export function GroupJoinPublishCard({
  checked,
  onChange,
  showHelp,
  onToggleHelp,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  showHelp: boolean;
  onToggleHelp: () => void;
}) {
  const checkboxId = "before-group-join-enabled";
  const helpId = "before-group-join-help";

  return (
    <div className="rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-3">
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={helpId}
          className="mt-1 h-4 w-4 shrink-0 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={checkboxId} className="block cursor-pointer text-sm font-semibold text-emerald-950">
            Autoriser les demandes d&apos;inscription
          </label>
          <p id={helpId} className="text-xs leading-5 text-emerald-900/66">
            Ouvrir les inscriptions ne publie pas l&apos;action. Les demandes ne deviennent possibles qu&apos;après sa publication.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleHelp}
          aria-label={showHelp ? "Masquer l'aide sur les demandes d'inscription" : "Afficher l'aide sur les demandes d'inscription"}
          aria-expanded={showHelp}
          aria-controls="before-group-join-help-details"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Info size={13} aria-hidden="true" />
        </button>
      </div>
      {showHelp ? (
        <p id="before-group-join-help-details" className="mt-3 rounded-lg border border-emerald-100/80 bg-emerald-50/70 px-3 py-2 text-xs leading-5 text-emerald-900/72">
          Cette option rend uniquement la préparation visible dans la page Rejoindre une action ; elle ne publie pas les champs de récolte finale.
        </p>
      ) : null}
    </div>
  );
}
