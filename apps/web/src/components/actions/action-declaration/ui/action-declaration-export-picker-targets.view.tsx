import {
  Download,
  FileText,
  Image,
  Megaphone,
  Send,
  Share2,
} from "lucide-react";
import type { ActionDeclarationExportTarget } from "@/lib/actions/exports/export-form-media";
import { cn } from "@/lib/utils";
import {
  getSelectedTargetLabel,
  getTargetTone,
} from "./action-declaration-export-picker.model";

const targetIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  png: Image,
  "story-instagram": Share2,
  "publication-facebook": Send,
  "publication-x": Megaphone,
};

type ActionDeclarationExportPickerTargetsProps = {
  orderedTargets: ActionDeclarationExportTarget[];
  activeBundleTargetIds: ActionDeclarationExportTarget["id"][];
  selectedTarget: ActionDeclarationExportTarget | undefined;
  onSelectTarget: (targetId: ActionDeclarationExportTarget["id"]) => void;
};

export function ActionDeclarationExportPickerTargets({
  orderedTargets,
  activeBundleTargetIds,
  selectedTarget,
  onSelectTarget,
}: ActionDeclarationExportPickerTargetsProps) {
  return (
    <div className="grid gap-3">
      {orderedTargets.map((target) => {
        const Icon = targetIcons[target.id] ?? Download;
        const isActive = target.id === selectedTarget?.id;
        const isRecommended = activeBundleTargetIds.includes(target.id);

        return (
          <button
            key={target.id}
            type="button"
            onClick={() => onSelectTarget(target.id)}
            className={cn(
              "group flex items-start gap-3 rounded-[1.4rem] border p-4 text-left shadow-sm transition hover:translate-y-[-1px]",
              isActive
                ? "border-emerald-500 bg-emerald-50 shadow-md"
                : getTargetTone(target),
            )}
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-black/5">
              <Icon size={18} className="text-current" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black tracking-tight">{target.label}</p>
                {isRecommended ? (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800">
                    Conseillé
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-current/60">
                {getSelectedTargetLabel(target)}
              </p>
              <p className="mt-2 text-sm leading-6 text-current/72">{target.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
