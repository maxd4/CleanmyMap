import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  CircleHelp,
  Clock3,
  KeyRound,
  LockKeyhole,
  LogIn,
} from "lucide-react";
import type { CardTone } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";

export type SpogomiActionState =
  | "authorized"
  | "permission_denied"
  | "code_required"
  | "session_required"
  | "pending"
  | "unknown";

type ActionStatePresentation = {
  label: string;
  Icon: LucideIcon;
  tone: CardTone;
  surfaceClassName: string;
  iconClassName: string;
};

const ACTION_STATE_PRESENTATIONS: Record<SpogomiActionState, ActionStatePresentation> = {
  authorized: {
    label: "Accès autorisé",
    Icon: BadgeCheck,
    tone: "emerald",
    surfaceClassName: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
    iconClassName: "text-emerald-700",
  },
  permission_denied: {
    label: "Accès non autorisé",
    Icon: LockKeyhole,
    tone: "red",
    surfaceClassName: "border-rose-300 bg-rose-50/75 text-rose-950",
    iconClassName: "text-rose-700",
  },
  code_required: {
    label: "Code requis",
    Icon: KeyRound,
    tone: "sky",
    surfaceClassName: "border-sky-300 bg-sky-50/75 text-sky-950",
    iconClassName: "text-sky-700",
  },
  session_required: {
    label: "Connexion requise",
    Icon: LogIn,
    tone: "slate",
    surfaceClassName: "border-slate-300 bg-slate-50/80 text-slate-950",
    iconClassName: "text-slate-700",
  },
  pending: {
    label: "Pré-requis à vérifier",
    Icon: Clock3,
    tone: "amber",
    surfaceClassName: "border-amber-300 bg-amber-50/80 text-amber-950",
    iconClassName: "text-amber-700",
  },
  unknown: {
    label: "Vérification indisponible",
    Icon: CircleHelp,
    tone: "slate",
    surfaceClassName: "border-slate-300 bg-white/80 text-slate-950",
    iconClassName: "text-slate-700",
  },
};

function spogomiActionStatePresentation(state: SpogomiActionState): ActionStatePresentation {
  return ACTION_STATE_PRESENTATIONS[state];
}
export function SpogomiActionStateHeader({
  state,
  className,
}: {
  state: SpogomiActionState;
  className?: string;
}) {
  const presentation = spogomiActionStatePresentation(state);
  const Icon = presentation.Icon;

  return (
    <p
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.1em]",
        presentation.surfaceClassName,
        className,
      )}
      data-spogomi-action-state={state}
    >
      <Icon size={15} className={presentation.iconClassName} aria-hidden="true" />
      {presentation.label}
    </p>
  );
}
