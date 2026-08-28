import type { ReactNode } from "react";
import { Info, type LucideIcon } from "lucide-react";
import type { SelectOption } from "./model";

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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-[#ECF8EF] px-3 py-1.5 shadow-sm">
          <Icon size={14} className="text-emerald-700" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-950/75">
            Pré-action
          </span>
        </div>
        <span className="h-px flex-1 bg-gradient-to-r from-emerald-200/80 to-transparent" />
      </div>
      <div>
        <h3 className="text-lg font-black tracking-tight text-emerald-950">{title}</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900/68">{subtitle}</p>
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

export function SelectShell({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  hint?: string;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
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
  return (
    <div className="rounded-[1.4rem] border border-emerald-200/70 bg-[#ECF8EF] px-4 py-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
        />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-emerald-950">Publier en tant que formulaire de groupe</p>
            <button
              type="button"
              onClick={onToggleHelp}
              aria-label={showHelp ? "Masquer l'aide" : "Afficher l'aide"}
              aria-expanded={showHelp}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50"
            >
              <Info size={12} />
            </button>
          </div>
          <p className="text-xs leading-5 text-emerald-900/66">
            Les autres membres pourront voir l&apos;action et envoyer une demande pour la rejoindre.
          </p>
        </div>
      </label>
      {showHelp ? (
        <p className="mt-3 rounded-2xl border border-emerald-200/70 bg-white/90 px-3 py-2 text-xs leading-5 text-emerald-900/72">
          Cette option ne publie pas les champs de récolte finale. Elle rend seulement le pré-formulaire visible dans
          la page Formulaire de groupe.
        </p>
      ) : null}
    </div>
  );
}
