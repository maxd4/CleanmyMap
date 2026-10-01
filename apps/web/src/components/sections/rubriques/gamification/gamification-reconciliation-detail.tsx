"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import { ReconciliationDetailSections } from "./gamification-reconciliation-detail-sections";
import type { ReconciliationDetailCopy } from "./gamification-reconciliation-detail.model";

export function GamificationReconciliationDetail({
  open,
  copy,
  locale,
  onClose,
  onFocusTarget,
}: {
  open: boolean;
  copy: ReconciliationDetailCopy;
  locale: string;
  onClose: () => void;
  onFocusTarget: (targetId: string) => void;
}) {
  const fr = locale === "fr";
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <CmmDialog
      open={open}
      onClose={onClose}
      size="xl"
      ariaLabelledBy="gamification-reconciliation-detail-title"
      ariaDescribedBy="gamification-reconciliation-detail-description"
      initialFocusRef={closeRef}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#ead8d2] pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b4362e]">{fr ? "Réconciliation" : "Reconciliation"}</p>
          <h2 id="gamification-reconciliation-detail-title" className="mt-1 text-xl font-black text-[#2c1a17]">{fr ? "Détail du recalcul" : "Recalculation details"}</h2>
          <p id="gamification-reconciliation-detail-description" className="sr-only">{fr ? "Détail des règles, de l’XP, du niveau et des éléments de gamification modifiés." : "Details about the rules, XP, level, and changed gamification items."}</p>
        </div>
        <CmmButton ref={closeRef} type="button" tone="tertiary" variant="ghost" size="sm" ariaLabel={fr ? "Fermer le détail" : "Close details"} onClick={onClose}><X size={18} aria-hidden="true" /></CmmButton>
      </div>
      <ReconciliationDetailSections copy={copy} fr={fr} onFocusTarget={onFocusTarget} />
    </CmmDialog>
  );
}
