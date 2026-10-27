import { RotateCcw } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmToast } from "@/components/ui/cmm-toast";
import { getActionDrawingUndoCopy, type ActionDrawingUndoState } from "./action-drawing-undo";

export function ActionDrawingUndoToast({
  state,
  onUndo,
  onClose,
}: {
  state: ActionDrawingUndoState;
  onUndo: () => void;
  onClose: () => void;
}) {
  const copy = getActionDrawingUndoCopy(state.operation);
  return (
    <CmmToast
      title={copy.title}
      tone="info"
      icon={<RotateCcw className="h-4 w-4" />}
      className="absolute bottom-3 left-3 right-3 z-[1100]"
      message={copy.message}
      actions={<CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={onUndo}>Annuler</CmmButton>}
      onClose={onClose}
      closeLabel="Fermer le message du tracé"
    />
  );
}
