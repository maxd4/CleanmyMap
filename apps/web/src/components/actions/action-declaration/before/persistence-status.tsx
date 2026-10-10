import { AlertTriangle, CheckCircle2, Cloud } from "lucide-react";
import { CmmPill } from "@/components/ui/cmm-pill";

export type BeforeActionPersistenceStatus = "clean" | "local" | "account" | "unsaved" | "error";

const STATUS_COPY: Record<Exclude<BeforeActionPersistenceStatus, "clean">, { label: string; detail: string; tone: "emerald" | "amber" }> = {
  local: { label: "Brouillon local", detail: "Vos informations restent dans ce navigateur jusqu’à un enregistrement explicite.", tone: "amber" },
  account: { label: "Enregistré dans mon compte", detail: "Cette action privée est reprise avec son même identifiant.", tone: "emerald" },
  unsaved: { label: "Modifications non enregistrées", detail: "Les changements sont conservés localement ; enregistrez-les explicitement pour mettre à jour l’action.", tone: "amber" },
  error: { label: "Erreur d’enregistrement", detail: "La dernière écriture n’a pas abouti. Vos changements locaux sont conservés si le navigateur le permet.", tone: "amber" },
};

export function ActionBeforePersistenceStatus({ status }: { status: BeforeActionPersistenceStatus }) {
  if (status === "clean") return null;
  const copy = STATUS_COPY[status];
  const Icon = status === "error" ? AlertTriangle : status === "account" ? CheckCircle2 : Cloud;
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-emerald-100 bg-white/85 px-3 py-2 text-xs leading-5 text-emerald-900/75" role={status === "error" ? "alert" : "status"} data-testid="action-before-persistence-status" data-persistence-status={status}>
      <Icon size={14} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
      <span className="min-w-0"><CmmPill tone={copy.tone} size="sm">{copy.label}</CmmPill><span className="ml-2">{copy.detail}</span></span>
    </div>
  );
}
